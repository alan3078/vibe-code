terraform {
  required_providers {
    coder = {
      source  = "coder/coder"
      version = ">= 2.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.30"
    }
  }
}

provider "coder" {}

variable "use_kubeconfig" {
  type        = bool
  default     = false
  description = "Use the Coder host kubeconfig. Set false when the Coder provisioner runs inside the target cluster."
}

variable "namespace" {
  type        = string
  default     = "coder"
  description = "Existing Kubernetes namespace in which project workspaces are created."
}

variable "workspace_image" {
  type        = string
  description = "Pinned registry image containing code-server and the golden app."
}

variable "git_remote_url" {
  type        = string
  default     = ""
  description = "Optional empty Git-provider repository URL for the golden project."
}

provider "kubernetes" {
  # Authenticate through the Coder provisioner's ServiceAccount when Coder runs
  # in-cluster, or through an explicitly supplied host kubeconfig for K3s.
  config_path = var.use_kubeconfig ? "~/.kube/config" : null
}

data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}

data "coder_parameter" "project_name" {
  name         = "project_name"
  display_name = "Project name"
  description  = "The isolated project created by the control plane."
  type         = "string"
  default      = "Vibe project"
  mutable      = false
}

locals {
  workspace_name = "coder-${data.coder_workspace.me.id}"
  workspace_labels = {
    "app.kubernetes.io/name"    = "vibe-code-workspace"
    "app.kubernetes.io/part-of" = "vibe-code-platform"
    "com.coder.resource"        = "true"
    "com.coder.workspace.id"    = data.coder_workspace.me.id
    "com.coder.workspace.name"  = data.coder_workspace.me.name
    "com.coder.user.id"         = data.coder_workspace_owner.me.id
    "com.coder.user.username"   = data.coder_workspace_owner.me.name
  }
}

resource "coder_agent" "main" {
  arch = "amd64"
  os   = "linux"

  startup_script = <<-EOT
    set -eu
    mkdir -p /workspaces/project/source
    export APPLICATION_DATABASE=/workspaces/project/application.sqlite
    if [ ! -f /workspaces/project/source/backend/main.py ]; then
      cp -R /opt/vibe/golden-app/. /workspaces/project/source/
    fi
    printf '# %s\n' '${data.coder_parameter.project_name.value}' > /workspaces/project/source/README.md
    cd /workspaces/project/source
    git config user.name 'Vibe Code Platform'
    git config user.email 'platform@localhost.test'
    if [ ! -d .git ]; then
      git init -b main
      git add README.md .clinerules .github backend frontend
      git commit -m 'Initialize golden project'
    fi
    if [ -n "$${GIT_REMOTE_URL:-}" ]; then
      git remote get-url origin >/dev/null 2>&1 || git remote add origin "$${GIT_REMOTE_URL}"
      # Workspace code never receives a Git credential. Attach a user-approved
      # credential in their Git client, or use a server-side Git broker.
    fi
    /usr/local/bin/vibe-workspace-start > /tmp/vibe-code-server.log 2>&1 &
  EOT

  env = {
    GIT_REMOTE_URL = var.git_remote_url
  }
}

resource "coder_script" "generated_app" {
  agent_id     = coder_agent.main.id
  display_name = "Run generated application"
  icon         = "/icon/terminal.svg"
  run_on_start = false
  script       = file("${path.module}/run-generated-app.sh")
}

resource "kubernetes_persistent_volume_claim_v1" "project" {
  metadata {
    name      = "${local.workspace_name}-project"
    namespace = var.namespace
    labels    = local.workspace_labels
  }

  wait_until_bound = false

  spec {
    access_modes = ["ReadWriteOnce"]
    resources {
      requests = {
        storage = "10Gi"
      }
    }
  }
}

resource "kubernetes_service_account_v1" "workspace" {
  metadata {
    name      = "${local.workspace_name}-runner"
    namespace = var.namespace
    labels    = local.workspace_labels
  }
  automount_service_account_token = false
}

resource "kubernetes_deployment_v1" "workspace" {
  count      = data.coder_workspace.me.start_count
  depends_on = [kubernetes_persistent_volume_claim_v1.project]

  metadata {
    name      = local.workspace_name
    namespace = var.namespace
    labels    = local.workspace_labels
  }

  spec {
    replicas = 1

    selector {
      match_labels = local.workspace_labels
    }

    strategy {
      type = "Recreate"
    }

    template {
      metadata {
        labels = local.workspace_labels
      }

      spec {
        automount_service_account_token = false
        service_account_name            = kubernetes_service_account_v1.workspace.metadata[0].name
        security_context {
          run_as_user     = 1000
          run_as_non_root = true
          fs_group        = 1000
          seccomp_profile {
            type = "RuntimeDefault"
          }
        }

        container {
          name              = "workspace"
          image             = var.workspace_image
          image_pull_policy = "IfNotPresent"
          command           = ["sh", "-c", coder_agent.main.init_script]

          security_context {
            allow_privilege_escalation = false
            read_only_root_filesystem  = true
            capabilities {
              drop = ["ALL"]
            }
          }

          env {
            name  = "CODER_AGENT_TOKEN"
            value = coder_agent.main.token
          }

          env {
            name  = "PROJECT_NAME"
            value = data.coder_parameter.project_name.value
          }

          resources {
            requests = {
              cpu    = "250m"
              memory = "1Gi"
            }
            limits = {
              cpu    = "2"
              memory = "4Gi"
            }
          }

          volume_mount {
            name       = "project"
            mount_path = "/workspaces/project"
          }

          volume_mount {
            name       = "tmp"
            mount_path = "/tmp"
          }

          volume_mount {
            name       = "coder-home"
            mount_path = "/home/coder"
          }
        }

        volume {
          name = "project"
          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim_v1.project.metadata[0].name
          }
        }

        volume {
          name = "tmp"
          empty_dir {}
        }

        volume {
          name = "coder-home"
          empty_dir {}
        }
      }
    }
  }
}

resource "coder_app" "code_server" {
  agent_id     = coder_agent.main.id
  slug         = "code-server"
  display_name = "Browser IDE"
  icon         = "/icon/code.svg"
  url          = "http://localhost:8080/?folder=/workspaces/project/source"
  share        = "owner"
  subdomain    = false

  healthcheck {
    url       = "http://localhost:8080/healthz"
    interval  = 10
    threshold = 12
  }
}

resource "coder_app" "generated_app" {
  agent_id     = coder_agent.main.id
  slug         = "generated-app"
  display_name = "Generated app preview"
  icon         = "/icon/browser.svg"
  url          = "http://localhost:8000"
  share        = "owner"
  subdomain    = false

  healthcheck {
    url       = "http://localhost:8000/health"
    interval  = 10
    threshold = 12
  }
}
