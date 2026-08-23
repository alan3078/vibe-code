# Freedom-first Vibe Coding Web Platform 計劃

## 1. Executive recommendation

唔建議由零開始重造 Lovable / Base44 或自製 browser IDE。最務實方案係組合成熟元件，再自行建立公司需要嘅 portal、template lifecycle、POC preview／handover、audit、cost 同 policy control plane：

- **Coder 作 workspace foundation**：管理 browser-accessible workspace、template、provisioning、lifecycle 同 workspace infrastructure。Coder 官方定位本身就係可自訂開發 workspace 同 AI agent infrastructure。[1]
- **code-server 作 browser IDE**：提供完整 terminal、remote filesystem、port proxy 同 extensions；但預設 marketplace 係 Open VSX，所以 Cline／公司指定 extension 必須先做真實 compatibility POC，唔可以假設 Microsoft Marketplace extension 一定可裝。[2]
- **OpenHands 作可選 agent runtime**：唔取代 IDE。Agent Canvas係browser agent control center；Agent Server提供 REST/WebSocket execution；Sandbox Server負責agent sandbox lifecycle。[4]
- **自建 React/Vite portal + NestJS/Fastify control plane**：承載公司 UX、SSO、access shutdown、template catalog、workspace/POC-preview/handover lifecycle、audit、policy toggles同cost dashboard。Python只保留作evaluation/graph workers；generated app template仍用FastAPI。
- **LiteLLM 作唯一公司模型入口**：每user/team/workspace virtual key、model access、budget、rate limit、routing/fallback。官方virtual-key文件明確支援spend tracking及model access，並要求PostgreSQL作key-management persistence。[5]
- **Langfuse 作 LLM observability，而唔係billing SSOT**：追蹤prompt、response、token、latency、tool steps及cost；prompt body收集必須按privacy mode控制。[6]
- **Git + OCI registry 作template SSOT**：IT publish immutable、versioned template；user唔再收ZIP。
- **Kubernetes令vibe-code平台本身達production-grade**；Docker Compose保持為每個POC project嘅portable development contract，但不可將共享host Docker socket交俾任意generated code。

> **Hard scope boundary：平台要production-grade；平台產生嘅app永遠只係POC，冇直接production promotion path。** 完成POC後只可提交IT handover package；IT department要重新review、refactor、測試、定architecture及自行部署。平台不可用「一鍵production」令人誤以為generated app已符合enterprise standard。

一句話：**Coder管環境，OpenHands/Cline管coding agent，LiteLLM管AI入口，Langfuse管trace，自建portal管公司流程。**

### 1.1 Market scan

| 選項 | 適合角色 | 判斷 |
|---|---|---|
| **Coder** | Workspace control plane | 首選基座；Community可自管workspace，但groups、custom roles、audit等治理能力有Premium邊界。要按pinned version逐項做edition matrix，唔好假設SSO/RBAC/audit/HA全部OSS免費。[1][3] |
| **code-server** | Browser IDE | 必要UI building block，但單獨使用冇完整workspace scheduler、template fleet、quota、deployment control plane。 |
| **OpenHands** | Coding agent + sandbox APIs | 同Coder互補；唔應取代workspace platform。OSS/Enterprise在SSO、RBAC、audit、多人治理有差異，採購前逐項核實。[4] |
| **Eclipse Che** | Kubernetes-native CDE | 技術成熟、DevWorkspace/Devfile導向；若公司已重度投資Kubernetes/OpenShift可考慮，否則營運複雜度高。[10] |
| **Ona（原Gitpod方向）** | Managed CDE/agent platform | 適合唔想自營workspace control plane而接受商業平台；要驗證customer-managed runner、data path、pricing及export能力。[11] |
| **Daytona** | Agent sandbox/workspace API | 適合做sandbox provider POC，但產品／license方向近年變動，唔應作未驗證嘅長期核心依賴。[12] |
| **DevPod** | Developer-controlled remote dev | 偏CLI/individual workflow，中央治理、fleet admin、audit同managed deployment不足。 |
| **Backstage** | Catalog/scaffolder | 適合成熟期template/catalog/ownership；唔係IDE、sandbox或deployment runtime。[7] |
| **Lovable/Base44** | UX benchmark | 可參考prompt-to-preview體驗；唔適合作為公司任意Python/Compose workspace核心。 |

**Buy/build結論**：V1採「Coder + 自建薄portal + code-server + LiteLLM」，OpenHands作第二agent mode。唔好同時部署Coder、Che、Backstage、OpenHands全套UI；會增加重複身份、catalog同operation surface。

---

## 2. Product principles

1. **Freedom by default**
   - 唔按coding題材封鎖user。
   - Preview環境唔需要人工approval。
   - Policy toggle、scope、owner同原因對user透明，避免hidden governance。

2. **Minimum mandatory controls only**
   - 永遠開：SSO、workspace isolation、secret protection、resource limit、admin-action audit、corporate control-plane/network protection。
   - 可配置：prompt retention、content filtering、extension/model/repository allowlist、internet egress、code-scan reporting、IT handover submission及hard budget stop。

3. **Portable, not locked-in**
   - 每個project都係正常Git repository。
   - 包含`docker-compose.yml`、`.devcontainer/`、environment contract、health check同POC runtime manifest。
   - User可download／clone後在local執行，唔會被平台綁死。

4. **Traceable from idea to IT handover**
   - Prompt -> Git diff -> tests -> preview -> handover package都有traceability；IT production implementation係另一條受管SDLC。

5. **Central template, decentralized creativity**
   - IT提供可靠baseline；user可以自由改business logic、UI、domain同dependencies。

---

## 3. 「Something special」：Project Passport + Time Machine

### 3.1 Project Passport

每個project自動產生一份machine-readable passport：

- template ID、version、release channel；
- source commit、dependency locks；
- extension及agent configuration；
- Compose services、internal ports、health checks；
- resource profile；
- DB/storage requirements；
- preview／UAT history及IT handover status；
- AI provider/model usage metadata；
- compatibility及migration status。

Passport令project可以：

- 一鍵搬返local；
- 一鍵複製成新workspace；
- 一鍵重建同一環境；
- 清楚知道template有冇落後；
- 部署前自動驗證，而唔需要IT逐部機處理ZIP。

### 3.2 Template Delta Update

IT發布template `1.3.0`後，平台唔覆蓋user code，而係：

1. 顯示`1.2.0 -> 1.3.0` semantic diff；
2. 建立upgrade branch；
3. 執行codemod／migration；
4. 顯示conflict、test同security結果；
5. user自行merge或留在舊版；
6. 只有critical template版本先由IT設定expiry／強制升級。

Coder templates可定義workspace infrastructure、image、parameter、IDE及feature，並可用CI/CD管理template變更。[3] Backstage Software Templates亦證明「code skeleton + variables + publish repository + task logs」係成熟scaffolding pattern，但V1毋須先引入完整Backstage；先在自建portal實作精簡catalog，規模增加再整合。[7]

### 3.3 Prompt-to-Handover Time Machine

在user同意嘅retention mode下，將以下事件串成一條timeline：

- prompt/request metadata；
- agent tool actions；
- Git diff/commit；
- tests/build output；
- image digest/SBOM；
- POC preview、rollback及IT handover event。

用途係debug、cost attribution、事故回溯同重現，**唔係內容審查工具**。如果prompt capture關閉，仍保留request ID、model、token、cost、latency同result status。

---

## 4. User experience

### 4.1 Citizen developer

1. SSO登入。
2. 選template、version/channel及resource profile。
3. 填project name、team、data sensitivity、target environment。
4. 60–240秒內開browser IDE。
5. 預載Cline及／或OpenHands入口、公司agent instructions、dependencies。
6. `docker compose up`啟動full stack。
7. Portal自動發preview hostname，唔要求user處理host port。
8. 一鍵run tests、snapshot、commit、preview deploy。
9. 查看自己AI/compute cost。
10. 一鍵export repository或開upgrade branch。

### 4.2 IT/template maintainer

- 在Git提交新template version；
- CI build、scan、test、sign image；
- publish到stable/beta/legacy channel；
- 指定適用team、resource profile、extension pack；
- 查看adoption、outdated versions、upgrade failures；
- rollback一個有問題嘅template release；
- 無需登入每個user workspace派ZIP。

### 4.3 Platform admin

可按不同層級操作：

- revoke login session；
- revoke LiteLLM virtual key；
- suspend單一workspace；
- pause POC preview；
- disable team access；
- rotate secret；
- set soft budget／可選hard cap；
- hibernate idle workspaces；
- break-glass操作，全部寫入append-only audit event。

### 4.4 Mobile Web：Codex-style asynchronous vibe coding

可以做到，但mobile唔應硬塞完整VS Code三欄layout。產品分兩個surface，共用同一repo/workspace/job truth：

- **Desktop Workspace Mode**：完整browser IDE、terminal、extensions、Compose；
- **Mobile Agent Mode**：task-first PWA，delegate -> leave -> notify -> review -> follow-up／PR。

Codex cloud本身以isolated cloud environment並行執行長任務，完成後review summary/diff或開PR；呢個係mobile experience應採用嘅interaction model，而唔係複製品牌/UI。[40]

#### Mobile主要頁面

1. **Task Inbox**：`Running`、`Waiting approval`、`Review ready`、`Failed`、`Merged`，按project/owner/filter；
2. **New Task Composer**：選project、base branch、template/workspace、model/capability、budget、risk mode，再輸入prompt；
3. **Plan & Approval**：agent先列plan、預計files/tools/tests/network actions；user可approve、修改scope或cancel；
4. **Live Timeline**：顯示plan update、command、file change、test、preview、checkpoint同stable error code；
5. **Review**：mobile-friendly file list、unified diff、risk summary、test/evaluation evidence；大diff先summary再逐file展開；
6. **Preview**：直接開authenticated `*.preview` responsive page／screenshot；
7. **Follow-up**：要求修正、retry failed stage、rollback checkpoint、open full desktop IDE；
8. **Finish**：create PR、request reviewer、archive task。Production deploy唔與coding approval混埋。

Voice prompt、相片／screenshot、spec attachment可以Stage 5後半加入；voice transcription後先顯示文字俾user確認，唔直接執行誤聽內容。

#### Durable mobile lifecycle

```text
DRAFT
 -> SUBMITTED
 -> PLANNING
 -> WAITING_APPROVAL
 -> QUEUED
 -> PROVISIONING
 -> RUNNING
 -> TESTING
 -> REVIEW_READY
 -> SUCCEEDED / NEEDS_USER_ACTION / FAILED / CANCELLED
```

- Mobile request先寫PostgreSQL `agent_tasks` + outbox，再由RabbitMQ派去Agent Runner；
- Browser鎖屏、關tab或office WAN切換後，server-side task繼續；
- SSE/WebSocket只係live projection，唔係task ownership；重連後用REST snapshot + monotonic event sequence補回missed events；
- submit使用idempotency key，避免mobile retry建立兩個task；
- runner有lease/heartbeat；worker死後從Git checkpoint/event log安全retry，無法無損resume就進`NEEDS_USER_ACTION`，唔假裝仍在運行；
- prompt draft存在IndexedDB；offline可以編輯，但重新連線前唔silent-submit。

#### Agent integration boundary

```text
Mobile/Desktop React PWA
        |
NestJS Agent Task API
        |
PostgreSQL task/event/approval truth + outbox
        |
RabbitMQ execution delivery
        |
Agent Runner Pod + isolated Git worktree
   +--> Codex adapter
   +--> OpenHands adapter
   +--> future approved agent adapters
        |
Git checkpoint -> tests/evaluation -> preview -> diff/PR
```

唔將UI綁死某一agent。定義internal `AgentAdapter` contract：

```text
start(task, workspace, policy)
streamEvents(runId)
approve(runId, approval)
followUp(runId, prompt)
cancel(runId)
resume(runId, checkpoint)
collectArtifacts(runId)
```

Actual Codex integration有兩條路：

- `codex exec --json`適合V2 asynchronous job adapter：官方non-interactive mode支援scripts/CI、JSONL progress events、structured final output及resume；平台將events normalize入自己timeline。[41]
- Codex App Server提供conversation history、approvals及streamed agent events，適合較深rich-client integration；但remote WebSocket transport現時標示experimental/unsupported，V2唔直接向browser暴露，最多在runner內用stdio/local transport做spike，外層仍由平台API隔離。[42]

OpenHands／其他agent用同一contract，避免Codex auth、pricing、feature或license改動鎖死platform。

#### Git concurrency

- 每個agent task用獨立branch + Git worktree；
- Start前記錄base SHA，所有write前建checkpoint；
- 同project多task可並行，但唔共用working tree；
- Review前檢查base drift、merge conflict及changed-file overlap；
- Mobile可以create PR，唔直接push/merge protected `main`；
- Agent完成唔等於成功：required tests/evaluation未有evidence就保持`REVIEW_READY/UNKNOWN`。

#### Mobile approval/security

權限分級：

| Mode | Agent可以做 |
|---|---|
| Read/plan | 讀repo、分析、出plan；不改file、不行任意command |
| Workspace write | 改task worktree、跑approved dev/test commands |
| Network/package | 額外批准後下載dependency／查外部資料，仍經egress policy |
| Privileged action | Secret、external side effect、deploy、destructive migration：step-up auth + separate approval；預設拒絕 |

- 唔設永久`Approve all`；approval scope綁run、action class、resource同expiry；
- 手機session採SSO、device policy、short-lived token；高風險action要step-up；
- Agent永遠冇platform DB admin、cluster-admin、host Docker socket或production credentials；
- Actual Codex/LLM credential要per-user隔離或用approved organization-managed gateway；唔共享一個員工OAuth home directory；
- Push notification只顯示project/task/status，唔放prompt、source、secret或diff內容；
- `Stop`會撤銷run lease、阻止新tool calls並要求runner terminate；已發生external side effect要另作compensation，UI唔虛構rollback。

#### Notification

- Web Push/PWA作主要mobile channel；Teams/email可選；
- Events：plan approval、needs user action、test failed、review ready、budget warning、task stopped；
- Notification帶task deep link；重新開app先經SSO取details；
- 每task可mute，bulk events要aggregate，避免每個command推一次。

### 4.5 App Package Catalog：只服務generated/current app

Scope收窄：**唔做ChatGPT/MCP plugin marketplace，亦唔畀user安裝platform runtime plugin。** 呢個catalog只係讓user喺建立或維護vibe-code app時揀功能package。

```text
Create Project / Project > Packages
  [x] Company SSO
  [x] RBAC
  [x] Audit Log
  [ ] File Upload
  [ ] Approval Workflow
  [ ] Teams/Email Notification
  [ ] Feature Flags
```

一個App Package可以同時包含：

- React components/hooks；
- FastAPI routes/services/dependencies；
- SQLAlchemy models + Alembic migrations；
- Compose/config changes；
- environment schema；
- deterministic installer/codemod；
- tests、docs、SBOM、upgrade/remove metadata。

所以佢比普通npm/PyPI library高一層：library只提供code；App Package負責將一個完整cross-stack feature正確compose入app。

#### 兩種使用時機

1. **Scaffold-time selection**：建立project時揀packages，composer一次過render initial repo；最穩定，冇merge conflict。
2. **Post-create install**：current app後加package；先做compatibility preflight，再開`package/<id>-<version>` branch/worktree，經CI/preview/PR，唔直改`main`。

#### Package composition而唔係template爆炸

唔為每個組合預製一個template，否則7個optional packages已經有大量組合。保留一個base template，再用manifest嘅`requires`、`conflicts`、`installOrder`及version constraints組合：

- `RBAC` requires `Company SSO`；
- `File Upload` requires `Object Storage`；
- `Approval Workflow`可requires `Audit Log` + `Notification`；
- 同一類auth/database provider只可選一個；
- User可以揀curated bundles，例如`Internal CRUD`、`Document Workflow`，亦可逐個package揀。

Known platform template可做到接近plug-and-play；任意legacy app只係best-effort，compatibility不明就標`MANUAL_ADAPTATION_REQUIRED`，唔由agent估住安裝。

---

## 5. Target architecture

```text
Desktop Browser / Mobile PWA
  |
SSO / WAF / Ingress
  |--------------------------|
  v                          v
React Portal             Workspace Router
  |                          |
NestJS/Fastify Control       +--> Workspace Pod/VM
  |                               - code-server
  |                               - Cline extension
  |                               - OpenHands/Codex agent adapter
  |                               - project source + persistent volume
  |                               - rootless compose/build client
  |
  +--> PostgreSQL (business/job/audit truth + outbox)
  +--> RabbitMQ quorum queues (execution delivery)
  +--> Redis (cache/presence/realtime only)
  +--> Template Registry (Git + OCI)
  +--> Workspace Provisioner (Coder/Kubernetes)
  +--> Port Broker / Preview Ingress
  +--> POC Runtime / Handover Controller
  |        +--> Remote BuildKit
  |        +--> OCI Registry
  |        +--> POC Preview / POC UAT runtime
  +--> Agent Session API / Notification Dispatcher
           +--> isolated Agent Runner + Git worktree
                  +--> Codex/OpenHands adapter

Workspace/runner agents
  +--> LiteLLM Gateway --> approved LLM providers
          |
          +--> usage/cost events
          +--> Langfuse traces (according to capture mode)

Platform telemetry
  +--> OpenTelemetry / Prometheus / Grafana / Loki
```

### 5.1 Control plane

建議：React/Vite PWA + NestJS/Fastify modular monolith，配PostgreSQL、RabbitMQ quorum queues同Redis cache。Generated project template仍維持React/Vite + FastAPI + SQLAlchemy；template同platform control plane唔需要同一runtime。

**唔建議platform metadata使用SQLite。** SQLite可以保留在generated app嘅local／single-instance profile，但platform本身需要HA、concurrent writes、多replica API、audit同background jobs。Generated app應提供：

- `sqlite`：local／small single-instance；
- `postgres`：較真實嘅shared-data POC profile；唔代表generated app因此成為production-ready。

### 5.2 Workspace plane

- Kubernetes分開node pools：control plane、interactive workspace、build、preview/runtime、可選GPU。
- 建議兩級runtime：一般可信IDE用standard container；AI agent、任意Compose、需要獨立dockerd或較高風險代碼用Kata/microVM。gVisor可作中間profile，但唔應將普通container當強tenant boundary。
- non-root、seccomp、drop capabilities、禁止host mounts。
- 唔mount host `/var/run/docker.sock`。
- 如一定要支援完整Compose，首選microVM內獨立dockerd；rootless engine或remote BuildKit作較輕量選項。先做兼容、privilege、mount、network同escape測試。
- Persistent volume保存working tree；Git remote係主要durable source，snapshot作快速復原。
- idle workspace hibernate；保留disk，停止CPU/RAM。

### 5.3 Port broker

Template passport聲明固定internal ports，例如frontend `5173`、API `8000`。平台用workspace ID建立hostname route：

- `frontend--<workspace>.preview.company`
- `api--<workspace>.preview.company`

唔直接暴露host port。User臨時開新port時，由portal建立有TTL、權限及audit嘅route。Ingress必須支援WebSocket、SSE同長連線。

### 5.4 Template有三層，唔好混為一談

1. **Workspace template**：OS image、IDE、extension、CPU/RAM、storage、agent runtime。
2. **Project template**：React/Vite、FastAPI、SQLAlchemy、DB profile、docs、tests、Compose。
3. **Runtime template**：POC preview／UAT ingress、health check、backup、resource limit、observability。

咁IT更新IDE/image時唔需要改business code；更新app scaffold時亦唔需要重建整個platform。

### 5.5 Preview演進同IT handover path

- **V0/V1唔自建preview platform。** React/FastAPI先以Coder Apps／workspace forwarded ports暴露authenticated URL；Coder template可以定義web IDE同Coder Apps。[48] 呢個preview依賴workspace運行，已足夠developer及少量登入stakeholder驗證。
- `docker compose up`仍係project portability及workspace development contract，但V1只支援golden template已聲明services；唔因此立即建立detached deployment controller。
- 只有adoption證明需要「workspace休眠後仍可供多人獨立查看」時，先加入detached POC preview：由同一Compose contract產生isolated ephemeral environment，Build在獨立BuildKit/build pool；記錄source SHA、template version、image digest、SBOM、health result及expiry。
- 唯一出口係 **IT handover package**：requirements、actors/use cases、architecture、dependency/package locks、tests、scan report、data classification、sample data、runbook、source SHA、image digest及known gaps。
- IT收到handover後建立獨立enterprise repository／branch及正式SDLC；要重新做security、data、availability、backup、support ownership及production deployment decisions。**不可直接將POC image升上production。**

### 5.6 Service boundary：唔需要由第一日拆microservices

**Kubernetes唔等於microservices。** 30–50 concurrent developers需要scheduler同isolation，但公司自建部分應先採 **modular monolith + durable workers**，避免身份、transaction、audit同failure tracing分散到十幾個service。

Deployment units按stage增加，唔一次過部署north-star全部components：

1. `portal-web`：React/Vite static UI；
2. `control-api`：NestJS/Fastify modular monolith，V1只做identity、project/template、workspace、cost、audit及handover orchestration；
3. V0/V1 external components：Coder、LiteLLM、PostgreSQL、Git，同現有CI；preview先用Coder Apps；
4. V2 async agent先加`platform-worker`／reconciler、RabbitMQ、AgentAdapter同event stream；
5. Redis只在presence/WebSocket fan-out/cache有實際需要先加；Langfuse按privacy/cost需求加；
6. Detached preview router/build pool、Python evaluation workers、Graphify/advanced scanners到adoption-driven stage先加。

只有當某個module有獨立scale、security boundary、release cadence或team ownership，先抽成microservice。唔應為咗「上K8s」而預先拆service。

### 5.7 Queue：PostgreSQL durable state + RabbitMQ execution broker

BullMQ係成熟嘅Redis-backed Node.js queue，官方production guidance涵蓋Redis persistence、reconnect、eviction及graceful shutdown等要求；問題唔係「成熟唔成熟」，而係平台需要跨NestJS同Python workers、broker-level acknowledgements同replicated durable queues。[28]

**RabbitMQ係async-agent stage嘅production target，唔係V1 prerequisite。** V0/V1由Coder provision workspace、Git CI做build/test，而portal只保存projects、handover requests、audit同usage rollup時，PostgreSQL transaction/state已足夠。到平台真正提供「關browser後由server跑30分鐘agent task」先加入PostgreSQL job truth + outbox + RabbitMQ quorum queues。RabbitMQ quorum queues以Raft replication提供durable replicated queue，publisher confirms及consumer acknowledgements適合agent/provision/build/evaluation command work。[29][30] BullMQ只保留為Node-only prototype fallback。

Kafka係durable event-streaming log，適合高吞吐event history、replay、analytics同多consumer streams；但job-level delay/retry、priority、cancel、per-job progress及poison-message處理要自行砌額外topic/state machine，所以唔適合作主要workspace task queue。[31] 將來usage/audit event量大到要獨立streaming platform，先考慮Kafka。

Target design：

- PostgreSQL `jobs` table係user-visible job/admission state source of truth；
- API同一個transaction寫business state + transactional outbox；
- dispatcher將outbox event以stable job ID publish到RabbitMQ；
- RabbitMQ使用publisher confirm、manual consumer ack、quorum queues同DLQ；
- NestJS orchestration worker及Python evaluation worker都可獨立consume；
- worker更新PostgreSQL state、attempt、heartbeat同result，成功commit後先ack；
- reconciler找出outbox未送、delivery uncertain、stalled或者lease-expired jobs並安全重新publish；
- Redis只負責session cache、WebSocket presence/pub-sub同短期rate limit，唔再承擔durable job broker；
- 所有consumer必須idempotent；RabbitMQ ack/confirms減少遺失，唔會神奇提供end-to-end exactly-once；
- workflow出現大量長時間wait、human approval、multi-step compensation後，先評估Temporal。

要分開三類flow：

| Flow | 是否queue | 實作 |
|---|---|---|
| Capacity admission | 必須durable | PostgreSQL state machine；保存position、age、resource class、cancellation |
| Provision/build/preview/handover/evaluation/snapshot/notification | 必須durable | PostgreSQL job/outbox + RabbitMQ quorum queue + lease/retry/DLQ |
| IDE、terminal、WebSocket、agent token stream | 唔可以batch queue | 直接interactive connection；只做backpressure/rate limit |

Job lifecycle：

```text
ACCEPTED -> QUEUED -> RUNNING -> SUCCEEDED
                    |       +-> RETRY_WAIT -> RUNNING
                    |       +-> NEEDS_USER_ACTION
                    |       +-> COMPENSATING -> FAILED
                    +-> CANCELLED
```

每個job必須有：

- idempotency key，防止double-click建立兩個workspace；
- lease + heartbeat，worker死後可安全reclaim；
- bounded exponential backoff + jitter；
- stable machine error code；
- checkpoint及compensation；
- attempt count、next retry、trace ID、user-visible status；
- manual retry/cancel；
- 永不無限retry。

### 5.8 Failure containment同self-healing workspace

目標唔係「永遠唔fail」，而係 **一部分fail唔可以令成個web白畫面，亦唔可以令user失去source code同修復入口**。

Failure classes：

| Failure | 平台行為 | User可做 |
|---|---|---|
| User app／preview crash | IDE、terminal、Git、agent保持運行；只標記`PREVIEW_FAILED` | 睇logs、改code、restart preview |
| Build/test/dependency fail | 保存完整stage、command、exit code及logs；唔刪workspace | `Heal in Workspace`、retry failed stage |
| LLM provider fail | LiteLLM fallback；再失敗就轉manual coding mode | 繼續IDE／terminal，稍後retry agent |
| Langfuse／telemetry fail | Telemetry寫outbox後補送；唔阻塞coding | 無需中斷工作 |
| Portal/FastAPI fail | 已存在workspace route／WebSocket在bounded grace內繼續；新control actions暫停 | 繼續編輯，portal恢復後reconcile |
| WebSocket斷線 | Client exponential reconnect；server狀態可reconcile | 唔reload成個app |
| Workspace process/pod fail | 重啟／reschedule並重新attach PVC | reconnect；source仍在PVC/Git |
| Workspace image/template壞 | 啟動minimal **Rescue Workspace**並掛同一PVC | commit/export source、修template |
| Capacity exhausted | `CAPACITY_QUEUED`，唔係500／login fail | 留在dashboard、等通知或揀較細profile |
| Quota/security/policy deny | 唔retry；明確stable error code及原因 | 改request或聯絡owner |
| Platform DB不可用 | Existing workspace盡量維持；新state-changing job fail closed | 繼續local workspace editing，等control plane恢復 |

Frontend resilience：

- route-level同panel-level React Error Boundaries，避免一個cost widget拖垮IDE/dashboard；
- last-known-good query cache；每個error panel有Retry、Open logs、Copy trace ID；
- API timeout、AbortController、bounded retry及stale-response generation guard；
- unsaved prompt/form draft存IndexedDB；source code仍由workspace filesystem + Git/PVC保護；
- realtime event只作低延遲提示，REST status/reconcile係authority；
- generic 500永遠映射成可理解incident card，唔直接render raw stack trace。

每個失敗job產生 **Failure Capsule**：

```text
.platform/failures/<job-id>.json
  - failure class / stage / stable error code
  - failed command and sanitized environment summary
  - relevant logs / trace ID
  - template version / source SHA / image digest
  - safe retry and reproduction instructions
```

`Heal in Workspace`會將Failure Capsule交俾Cline/OpenHands，先建立checkpoint／recovery branch，再讓agent修改project code、跑test同重啟preview。Agent只可修復user repository；**唔可以取得cluster-admin、平台DB或host權限去「自動修platform」**。

User app process、preview process同IDE process要分開supervise。Generated app crash只影響preview，唔可以殺死browser IDE。每次agent大改前建立Git checkpoint／workspace snapshot；修復失敗可rollback。

### 5.9 Docker、migration、bootstrap同seed contract

每個project template要交付完整但分責任嘅runtime contract：

```text
Dockerfile
compose.yaml
compose.poc.yaml
.devcontainer/devcontainer.json
alembic.ini + migrations/
scripts/validate-config
scripts/migrate
scripts/seed-demo
scripts/backup-sqlite
scripts/healthcheck
platform.yaml
```

Bootstrap唔可以係一個每次啟動都無條件重做所有事嘅shell script。分開：

1. **Image build**：locked dependency install、frontend build、runtime import及migration CLI smoke；
2. **Workspace initialization**：clone/render、設定non-secret defaults、建立本地目錄；要idempotent；
3. **Schema migration**：Alembic `upgrade head`，記錄revision、開始／完成／失敗；Alembic以migration environment及revision scripts管理SQLAlchemy schema演進。[20]
4. **Seed**：只在明示`POC_DEMO_SEED=true`或手動command執行；
5. **Application start**：只在migration成功後啟動API；
6. **Readiness**：驗證DB revision、API及必要dependency，而唔只檢查process存在。

Compose POC flow：

```text
postgres/sqlite-volume -> migrate(one-shot) -> seed-demo(optional profile)
                                          -> api -> web/preview
```

- 單instance SQLite POC可由one-shot migrate service更新schema，但migration前先用SQLite Backup API／`VACUUM INTO`建立consistent backup、`integrity_check`及checksum；
- PostgreSQL POC亦由one-shot migration job執行，唔可以每個API replica一齊race migration；
- migration失敗時API唔啟動，但IDE保持可用並產生Failure Capsule；
- seed必須係synthetic、deterministic、idempotent、versioned，冇真PII／credential；
- seed唔可因container restart重複插入；用stable natural key或seed-version table；
- production-style IT handover只帶schema、migrations及approved sample/seed，預設唔帶POC live data。

### 5.10 Docker-in-Docker決策

**禁止將host `/var/run/docker.sock`掛入workspace，亦禁止在shared host直接跑privileged DinD sidecar。** Docker官方安全文件同樣將daemon control視為高權限攻擊面；呢兩種做法等同將host-level能力交俾generated code。[18]

採兩個runtime profiles：

| Profile | Docker能力 | 適用 |
|---|---|---|
| Standard | Devcontainer/processes + remote BuildKit；冇nested daemon | 大部分React/FastAPI coding、test、image build |
| Compose Sandbox | Kata/microVM內獨立dockerd，或通過兼容測試嘅rootless Docker/Podman | 真正需要`docker compose up`嘅multi-service POC |

所以答案係：**唔需要在所有workspace使用傳統DinD；需要full Compose時，就在microVM／強sandbox內提供private Docker daemon。** Compose profile消耗較多資源，要獨立quota、node pool及concurrency cap。Build image優先使用remote rootless BuildKit，避免每個workspace長期維持daemon。

### 5.11 Retention、expiry同scheduled maintenance

Retention必須按artifact type、data classification同owner分開，唔可以一個「保留90日」套晒所有資料。建議起始policy：

| Data/artifact | 初始policy | 行為 |
|---|---|---|
| Idle workspace compute | 30分鐘無活動stop | 保留PVC/source，通知user |
| Inactive workspace | 30日archive；90日delete candidate | 7日及1日前通知；legal hold／handover可排除 |
| POC preview | 72小時TTL，可申請延長至30日 | 到期先停route/runtime，再按policy刪state |
| Build/cache artifacts | 14日 | pinned handover artifacts例外 |
| Failure Capsule/job logs | 30–90日 | secrets redacted；project owner可export |
| Job/outbox history | 90日 | audit相關event另存audit store |
| Prompt body | 預設唔保存 | Opt-in時按classification設短retention |
| Prompt/token/cost metadata | 90日baseline | FinOps／audit需求可延長 |
| Admin/security audit | 365日baseline | 最終由公司policy/legal決定 |
| Platform PostgreSQL PITR | 14–30日baseline | 每月restore drill |
| Handover package | Project lifecycle／IT接收政策 | immutable manifest + checksum |

所有delete/archive job要soft-mark -> grace period -> physical delete；必須idempotent、可重跑、有audit、dry-run及deleted-count evidence。User在dashboard見到expiry，並可在policy容許下extend、export或handover。

Scheduled maintenance唔應靠node OS `cron`去直接改platform：

- Kubernetes CronJob只做idempotent sweeper、backup verification、cost rollup、artifact cleanup、notification digest；CronJob本身按schedule建立Jobs，但job仍需idempotent並處理重複／missed execution。[19]
- continuous reconciler負責workspace desired-vs-actual state、stuck jobs、lease expiry同preview expiry；
- 唔建立「每workspace一個CronJob」；deadline存在PostgreSQL，由scheduler批次claim；
- CronJob用`concurrencyPolicy: Forbid`、deadline、timeout、history limit及service account最小權限；
- template／base-image update由CI偵測並建立candidate PR，**唔可以cron自動覆蓋existing workspace或直接promote**；
- security rebuild可以自動產生candidate image，但要經tests、scan、canary同channel promotion。

### 5.12 Active-active、active-passive同state ownership

唔應將所有component一律叫active-passive。正確做法係按state model分：

| Component | State model | HA mode | Failure behavior |
|---|---|---|---|
| Portal static assets | Stateless | CDN/object active-active | 任一origin/CDN edge可serve |
| NestJS control API | Stateless | 3+ replicas active-active，跨AZ topology spread | 新request轉去healthy replica；冇in-memory job/session truth |
| Workspace/preview proxy | Connection-state only | 3+ replicas active-active | Existing WebSocket可能重連；新connection去另一replica |
| Reconciler/dispatcher | Durable state在PostgreSQL | 多replica active-active + DB lease/leader election | 同一job只可被有效lease owner處理 |
| RabbitMQ | Stateful broker | Quorum queues；每queue有leader/followers | Node loss後重新選leader、unacked redelivery |
| PostgreSQL | Stateful SSOT | Single writable primary + synchronous/managed standby；PITR | Automatic failover；clients reconnect；避免雙primary |
| Redis | Ephemeral/shared cache | Managed primary-replica/Sentinel active-passive | Cache/presence可重建；唔承擔durable jobs |
| Object store/registry | Stateful durable | Provider/distributed replication | Artifacts按digest重取；跨AZ durable |
| User workspace | Stateful compute + per-workspace PVC | **Single active workspace**；node fail後reschedule/reattach | 短暫中斷；Git/snapshot/PVC復原，唔假裝continuous HA |
| Build/evaluation job | Ephemeral | 多worker active-active | Job retry/redelivery；artifact只在成功後commit |

Kubernetes topology spread將replicas分散到node/AZ，避免三個API pods落同一failure domain。[36] PostgreSQL streaming replication/warm standby係active-passive基礎，但應優先用managed HA及實測promotion/reconnect。[37]

Regional design採 **single-region multi-AZ active + warm-passive DR region**：

- Active region：serve portal、API、IDE、workspace、preview及writes；
- Passive region：預先有network、GitOps manifests、images、secrets references同最低control capacity，但唔同時接受writes；
- PostgreSQL log/PITR、object store、registry及critical manifests複製到DR；workspace未commit process state唔作跨region同步承諾；
- Failover必須有fencing：先停止／確認primary writes，再promote DR、驗證DB/queue/object store、最後切DNS；
- 初始hypothesis：AZ failure RTO 15分鐘內、control-plane RPO接近0；regional RTO 2小時內、RPO 15分鐘內。正式值要按managed service能力及restore drill證明；
- 唔採multi-region active-active PostgreSQL/workspaces，避免split-brain、PVC locality同queue ordering複雜度。

### 5.13 Network zones、DMZ、WAF同trust boundaries

```text
Corporate device / Zero-Trust access
        |
Public/Private DNS + DDoS protection
        |
Managed WAF / L7 Edge  [DMZ]
        |
Regional private Load Balancer
        |
Gateway API / Ingress replicas  [Ingress zone]
   +----+-----------------------------+
   |                                  |
Portal/API/Coder/LiteLLM       Workspace/Preview Gateway
[Control app zone]                    |
   |                           [Untrusted workspace zone]
   |                                  |
PostgreSQL/RabbitMQ/Redis      Egress Gateway/NAT + DNS policy
/Object store [Data zone]              |
                                      Internet/Git/package/model gateway

Management zone: GitOps, CI runners, monitoring, backup, private admin access
```

Zones同minimum flows：

1. **Edge/DMZ**：只接受TCP 443；80只作optional redirect。WAF/DDoS/rate limit，冇database或Kubernetes API route。WAF係HTTP application attack control，唔取代backend AuthZ或NetworkPolicy。[39]
2. **Ingress zone**：Gateway/Ingress有獨立node pool及private backend；只可連approved portal/API/proxy Services。Gateway API用role-oriented Gateway/Route model分infra owner同app route owner。[38]
3. **Control app zone**：Portal API、Coder control、LiteLLM、dispatchers；只用service identity連指定data services及Kubernetes API verbs。
4. **Untrusted workspace zone**：獨立namespace/node pool/runtime class；default-deny ingress/egress；禁止連control plane、cloud metadata、data zone、management CIDR。
5. **Build/evaluation zone**：獨立ephemeral workers；可讀immutable source、registry/package mirrors及寫artifact store，但冇user/session或production secrets。
6. **Data zone**：PostgreSQL、RabbitMQ、Redis、object store全部private endpoint／private subnet，冇public IP；只接受named service accounts/namespaces。
7. **Management zone**：GitOps、observability、backup、admin；只經VPN/Zero Trust/PAM，唔經workspace network。

Kubernetes NetworkPolicy用default-deny再逐條allow，但要先確認CNI真正enforce；API object存在唔等於network plugin已執行。[34] Freedom-first仍可預設容許一般Internet egress，但永遠block metadata、platform admin、private data/control networks；所有egress經NAT/egress gateway記錄destination、bytes同workspace identity。

### 5.14 Load balancing、WAF profiles同WebSocket

分三個hostname/policy boundary：

| Host | WAF/auth policy | Routing |
|---|---|---|
| `vibe.company` | Strict managed rules、SSO、CSRF/rate limit | Portal + control API |
| `*.ide.vibe.company` | SSO、WebSocket-aware timeout、connection/rate limits；避免generic body rewriting | Coder/IDE/terminal proxy |
| `*.preview.vibe.company` | SSO預設、basic WAF/rate limit、short TTL；視為untrusted POC | Preview port broker |

- API唔需要sticky session；session/job state在PostgreSQL/Redis。Round-robin/least-connections即可；
- WebSocket建立後自然留在同一proxy；reconnect可去另一replica。Deploy用readiness removal、connection drain同足夠termination grace，唔好硬斷terminal；
- WAF/LB要實測WebSocket upgrade、idle timeout、large upload、SSE buffering、long agent stream同wildcard TLS；
- Edge termination後到regional ingress要re-encrypt TLS；內部service mTLS可在有明確identity需求時加入，唔為架構圖盲目上full service mesh；
- Azure single-region mapping可用Application Gateway WAF v2／等價managed WAF + private AKS ingress；未來multi-region先加Front Door/global DNS layer，避免V1重複兩層WAF。

### 5.15 Port preservation同workspace port broker

**唔為每個workspace分配public host port。** Kubernetes每個Pod/Compose sandbox有自己network namespace，可以重用5173、8000、5432等container ports；外部用hostname route，避免port collision同巨大firewall range。

```yaml
# platform.yaml
services:
  web:
    port: 5173
    protocol: http
    exposure: authenticated-preview
  api:
    port: 8000
    protocol: http
    exposure: authenticated-preview
  postgres:
    port: 5432
    exposure: internal-only
```

Port policy：

| Scope | Policy |
|---|---|
| Public edge | TCP 443 only；80 optional redirect |
| User container ports | 1024–65535均可在sandbox內使用，但要避開template內宣告嘅platform sidecar ports |
| Platform reserved inside workspace pod | 10000–10099，供IDE agent、health、local proxy；template validation阻止collision |
| Preview exposure | 只暴露`platform.yaml`明示HTTP/HTTPS/WS services；預設每workspace最多10個 |
| DB/cache/debug ports | internal-only；唔經WAF或public LB |
| Host networking | 禁止`hostPort`、`hostNetwork`及per-workspace NodePort |

Kubernetes NodePort通常會由cluster-wide range分配port，但本平台唔用NodePort做workspace preview；用Gateway/Service routing，避免node firewall同port exhaustion。[35]

如真係有internal raw TCP POC需求，另設專用L4 gateway及短期lease：external/internal-LB pool可由`20000–20999`開始，最多5個raw ports/user、只限corporate network、有audit同expiry；50 users最壞250個allocation，1000-port pool仍有750個headroom。呢個係optional exception，HTTP/WebSocket apps唔需要。

### 5.16 Network bandwidth同capacity budget

Bandwidth要分三條路計，唔可以只睇WAF：

1. **North-south edge**：portal、IDE WebSocket、agent status、preview traffic；
2. **Registry/package egress**：image pull、npm/pip、Git clone；通常係morning spike最大項；
3. **East-west/data**：workspace to proxy、worker to object store、PostgreSQL/RabbitMQ replication。

Sizing公式：

```text
peak_Mbps = active_IDE * IDE_Mbps
          + active_previews * preview_Mbps
          + concurrent_pulls * image_MB * 8 / pull_window_seconds
          + build/artifact traffic
```

一個只作起始測試嘅example：50 IDE × 0.2 Mbps + 20 previews × 1 Mbps + 10個800 MB image在5分鐘拉完 = 約243 Mbps；加50% headroom約365 Mbps。Image pull唔經WAF，所以edge同registry path要分開量度。初始infra應提供至少1 Gbps級別node/registry/package-cache path，再由真實p95調整；唔將呢個example當capacity保證。

- Registry mirror、npm/pip cache及template pre-pull減少外網burst；
- Build/evaluation node pool用獨立egress/NAT budget，唔同IDE互搶；
- 監測WAF/LB bytes、WebSocket connections、retransmits、NAT/SNAT port usage、registry throughput、image pull time、DNS latency、RabbitMQ replication及PVC/object-store throughput；
- 以PriorityClass/queue保護interactive IDE，build storm只可令build排隊，唔可以拖死terminal。

### 5.17 Hong Kong site offices + back office topology

Assumption：所有users、site offices、back office、primary/DR infrastructure同data residency均在香港。**Platform唔應host喺back office server room，亦唔應令所有site traffic hairpin經back office。** Office係access edge；platform放兩個物理風險分離嘅香港data-centre/cloud failure domains。

```text
Site Office A -- Primary ISP ----\
              -- Secondary/5G ---+--> Internet/SD-WAN --> HK Edge/WAF
Site Office B -- Primary ISP ----+                         |
              -- Secondary/5G ---/                         +--> HK DC/Cloud A [Active multi-AZ]
Back Office   -- Carrier A ------\                         |
              -- Carrier B -------+------------------------+--> HK DC/Cloud B [Warm passive DR]

Remote/alternate-site users --> Zero-Trust access --> same HK Edge/WAF
```

#### Office connectivity

- 每個site至少兩條failure-independent paths：不同carrier/last-mile，secondary可用5G只作短期fallback；
- SD-WAN/IPsec health-check自動切路，但user session仍要支援WebSocket reconnect；
- 每個office做local secure Internet breakout去HK WAF，唔回程back office再出Internet；
- 唔跨office伸延Layer 2；每個site獨立routed VLAN/VRF：corporate、BYOD/guest、management、voice/IoT；
- Platform access走device identity + SSO/Zero Trust；admin access另走PAM/VPN，唔同一般developer path；
- DNS/IdP唔可以只依賴back office單一server。如果仍有on-prem AD connector/private DNS resolver，要在兩個HK hubs/facilities各有instance；
- Back office斷電／firewall故障時，site offices仍可經自己ISP直達platform；site office全斷時，可按公司政策用另一office或remote Zero-Trust access。

#### HK infrastructure placement

- Active同DR唔可以只係同一building兩個server rooms；要分開電力、carrier、fire/flood/building risk；
- Active facility內stateless services跨可用區/故障域；stateful services按上一節primary/standby/quorum設計；
- Warm-passive HK facility保存network、GitOps、images、PITR/object replication及最低control capacity；
- Office routes同DNS health checks要同時知道兩個HK ingress endpoints，failover唔需要逐間site手改firewall；
- HK-only DR可以處理office、building、carrier或單一DC/cloud-region事故，**處理唔到territory-wide香港 outage**。呢個係明確residual risk；若policy永遠禁止境外DR，就接受並記錄，而唔虛構跨地域HA。

#### Office WAN sizing

Office端只傳browser IDE、terminal、Git UI、agent stream同preview；Docker image pull/build/package install留在cluster，所以唔需要將cluster 1 Gbps image-pull budget乘返每間office。

保守起始公式：

```text
office_committed_Mbps = concurrent_developers * 5 Mbps * 1.3 headroom
```

例子：10 concurrent developers約65 Mbps，建議dual 100 Mbps；20人約130 Mbps，建議dual 200 Mbps；全部50人集中一處約325 Mbps，可用dual 500 Mbps或1 Gbps級別。5 Mbps/user係初始reservation假設，正式值由office packet loss、latency、WebSocket reconnect、preview throughput同peak upload量度。

QoS優先次序：

1. DNS、SSO、IDE/terminal WebSocket、control API；
2. agent stream及互動preview；
3. source download/upload；
4. bulk artifact download、background update。

每個site要監測兩條WAN link嘅latency、jitter、packet loss、availability、VPN/SD-WAN tunnel state、DNS time、WebSocket reconnect及per-class throughput；唔可以只ping gateway當office體驗正常。

### 5.18 App Package Catalog、composer同installer

```text
Create Project / Project > Packages
        |
App Package Catalog metadata (PostgreSQL)
        |
Dependency + compatibility resolver
        |
Signed package artifact resolver
  +--> private npm / PyPI libraries
  +--> Git codemods/templates
  +--> optional OCI sidecar images
        |
Scaffold Composer / Post-create Installer
        |
Generated repo or project branch/worktree
        |
CI/evidence -> preview -> PR
```

Catalog item唔只係一粒npm package；建議manifest：

```yaml
apiVersion: vibe.platform/v1
kind: AppPackage
metadata:
  id: company-sso
  version: 1.3.0
spec:
  compatibility:
    templateFamilies: [react-fastapi]
    minTemplateVersion: 2.0.0
    frontend: react-18+
    backend: fastapi
    database: [sqlite, postgresql]
  requires: []
  conflicts: [local-password-auth]
  installOrder: 10
  artifacts:
    npm: [company-auth-react]
    python: [company-auth-fastapi]
    codemods: [install-auth]
    migrations: [identity-session-schema]
  configSchema: schemas/sso.schema.json
  requiredApprovals: [idp-client-registration, secret-reference]
  tests: [login, logout, invalid-state, role-denied, session-expiry]
  upgradeFrom: [1.1.x, 1.2.x]
```

Package version同artifacts用digest固定、SBOM、signature、provenance及release channel：`candidate -> canary -> stable -> deprecated -> blocked`。Composer只接受catalog已批准digest；唔在runtime從Internet取`latest`或執行任意third-party postinstall。

#### Company SSO App Package

要分清兩層：

1. **Vibe platform SSO**：developer登入portal/IDE；
2. **Generated app SSO**：POC/app end users登入。呢層由`Company SSO` App Package加入project。

SSO package唔係純frontend button，至少包括：

- React auth provider/login/logout/session-expiry components；
- FastAPI dependency/middleware、callback/logout/`/api/me` routes；未來另有NestJS app package variant；
- OIDC discovery、authorization-code flow、state/nonce/PKCE或BFF session contract；OIDC定義end-user identity claims及ID Token流程。[45]
- Secure + HttpOnly + SameSite session cookie，server-side token handling；
- user identity、external subject、role/group mapping migration；
- backend AuthN **及 AuthZ** guards；只在frontend隱藏menu唔算授權；
- environment-specific issuer/client ID/redirect URI schema；client secret只用Vault/secret reference；
- 每個app/environment獨立IdP client registration，唔共用platform OAuth client；
- Mock/test IdP E2E：login、logout、expired session、invalid state/nonce、role denied、disabled user；
- local dev fallback必須明示且production build硬性禁用。

IdP registration、redirect URI同group mapping仍要IT/identity owner批准。Package可產生registration request/manifest，但唔擅自建立production enterprise application。

#### Composition、upgrade同remove

- Scaffold-time由composer按dependency graph排序後一次過render；
- Post-create install/upgrade永遠開branch/PR，保留base SHA同checkpoint；
- Deterministic installer/codemod先做標準變更，agent只在compatibility gap時提出adaptation diff；security核心唔由LLM自由重寫；
- Package combination測base + individual package、required dependency chain、常用curated bundles同高風險pairwise combinations，唔窮舉所有排列；
- Migration測fresh、upgrade-from-previous、base-template upgrade同rollback feasibility；destructive migration唔自動rollback；
- Upgrade由catalog發candidate branch，project owner選時間merge，唔silent overwrite；
- Remove先檢查routes、DB ownership、data retention、dependent packages及secret/client decommission，唔係單純刪dependency；
- 每次輸出selected package list、resolved versions、files changed、config required、migrations、SBOM、test evidence、known gaps同remove status；handover package亦保存呢份package lock。

#### Package safety boundary

- App Package只修改generated/project branch，冇platform token、cluster-admin、host Docker socket或production secrets；
- User只能揀catalog內approved packages，唔可以上傳任意runtime plugin；
- Installer在ephemeral isolated runner執行，package permissions、network、filesystem write scope同timeout預先聲明；
- UI-only library唔可以聲稱已提供backend AuthZ、audit durability或migration；
- Package install/remove失敗只令branch job fail，existing app/main/preview last-known-good保持可用；
- Catalog保留last-known-good artifact、compatibility evidence、owner同kill/block status。

### 5.19 Consistency、latency同availability按資料類型設計

本平台唔接受「全系統百萬RPS + 全部strong consistency + 99.999% + <50 ms」做無來源總要求。實際workload係30–50 concurrent developers、長連線IDE/terminal、分鐘級agent/build jobs、preview同image/package bursts；要按user journey及failure domain訂SLO，唔為面試題數字重造distributed database。

| Data/action | Consistency要求 | 做法 |
|---|---|---|
| Login revoke、policy、approval、budget hard cap | Strong transaction | PostgreSQL writable primary；transaction、unique constraint、row/version check |
| Job state、capacity admission、package install state | Strong transition | PostgreSQL state machine + idempotency key + optimistic/row lock |
| DB state到RabbitMQ command | Atomic intent + at-least-once delivery | Transactional outbox；publisher confirm；consumer以stable job ID idempotent處理 |
| Git source/checkpoint、image/package artifact | Immutable identity | Commit SHA／content digest；唔用last-write-wins |
| Task progress/event timeline | Per-task ordered、可短暫延遲 | Durable sequence number；reconnect用HTTP snapshot + event gap replay |
| Presence、typing、WebSocket fan-out、cache | Eventual／可重建 | Redis；loss後由PostgreSQL snapshot重建 |
| Metrics、log search、cost dashboard | Eventual acceptable | Async ingest；顯示data freshness |
| Preview route/readiness | Desired state eventual，但唔可早報ready | Reconciler + readiness gate；ready後先發URL |

**唔自行implement Paxos/Raft/vector clocks。** RabbitMQ quorum queues內部已用Raft並由publisher confirms/consumer acknowledgements提供明確delivery boundary。[29][30] Kubernetes/etcd及managed stateful products亦自行處理consensus。Application只處理transaction、idempotency、lease、version同reconciliation。Random election timeout、heartbeat tuning同log replication correctness係產品operator concern，唔放入NestJS business code。

**唔用自製memory log + batch flush作durability。** Control/job truth先commit PostgreSQL WAL；RabbitMQ訊息用durable quorum queue、publisher confirms及manual ACK。自製memory-first log會在process/node/power failure遺失已向user確認嘅task，亦重複storage engine已解決嘅checksum/fsync/recovery問題。

Read-after-write亦唔需要vector clock：interactive job/policy/approval read由writable primary讀，response帶row version/event sequence；analytics先可讀replica。日後如加read replicas，lag-sensitive endpoint保持primary或用database LSN/replica-catch-up機制，唔將一致性責任推畀mobile client。

#### 可用性同latency目標

- `99.999%`全年只容許約5.256分鐘downtime，對30–50人內部POC平台成本同複雜度不合理；
- 初期portal/control plane建議`99.9%`月度目標（30日約43.2分鐘），multi-AZ/failover drill穩定後再以`99.95%`（約21.6分鐘/月）做target；
- `99.99%`及以上只在監測證明、business impact同budget支持後提升，唔先寫數字再倒砌架構；
- Durability、availability、RTO/RPO分開：API短暫不可用唔代表Git/source/job truth遺失；
- 唔設全系統`<50 ms`。Login/WAF/DB metadata、WebSocket reconnect、agent first event、build同preview各有不同budget；沿用submit在2秒內durably回`ACCEPTED`、mobile重連5秒內補snapshot/events等journey SLO；
- Load test用真實混合：IDE/WebSocket、agent queue、build/image burst、preview、handover、failover；唔用無業務根據嘅百萬empty HTTP requests證明架構。

---

## 6. AI gateway、prompt audit同cost management

### 6.1 LiteLLM角色

- provider master keys只存在Vault／cloud key manager；
- 每user/team/workspace簽發virtual key；
- key包含model access、rate limit、budget、expiry、metadata tags；
- workspace停用時即時revoke key；
- routing/fallback按能力同provider availability；
- 對user只暴露穩定capability alias，例如`code-fast`、`code-private`、`vision`，後端model/provider可按健康、延遲、quota及成本轉換。[15]
- BYOK設為IT toggle：開啟時要清楚標示相關usage無法完整納入公司cost/audit。

LiteLLM文件將部分audit／admin能力以`✨`標示；採購前必須建立 **OSS / enterprise / self-hosted** feature manifest。無論用邊個edition，平台自己仍要保存workspace、deployment、policy同kill-switch audit，唔可以將公司唯一audit trail綁死在gateway產品。[13]

### 6.2 Langfuse角色

Langfuse適合trace及分析prompt、response、tokens、latency、tools同cost。[6] 但唔應作財務billing唯一SSOT；每月要用provider invoice對賬LiteLLM usage。

### 6.3 Prompt capture modes

| Mode | Prompt/response body | Metadata/cost | 建議用途 |
|---|---:|---:|---|
| Off | 不保存 | 保存 | 預設，最大自由/privacy |
| Redacted | 移除secret/PII後保存 | 保存 | troubleshooting |
| Full encrypted | 加密保存、短retention、嚴格RBAC | 保存 | 特定team明確批准 |

User應在UI睇到目前mode同retention，IT改policy要有audit event。

### 6.4 Cost模型

- **AI**：user/team/project/workspace/model、input/output/cache tokens、requests、latency、provider cost。
- **Compute**：active workspace hours、resource profile、storage、build minutes、preview/runtime hours。
- **預設**：soft alert + anomaly detection；hard stop只作可配置選項。
- **保護shared system**：即使hard budget stop關閉，仍保留極高runaway ceiling及rate limit，避免loop失控。
- Budget hierarchy：platform emergency ceiling -> team -> user -> project/key -> agent session；70%及90%先soft alert。
- Budget依賴DB狀態；如果LiteLLM/PostgreSQL/Redis成本狀態不確定，外層Platform Control API應fail closed於新session／新key，既有interactive session則按明示policy處理，唔好靜默fail open。[14]
- Revoke測試必須包括auth-cache invalidation；UI顯示disabled唔等於已阻止cached key繼續用。

---

## 7. Freedom-first policy matrix

| Control | 預設 | 理由 |
|---|---|---|
| SSO/MFA、team identity | On | 必要身份邊界 |
| Workspace isolation | On | generated code不可影響其他user |
| Secret vault／no plaintext provider key | On | 必要secret安全 |
| CPU/RAM/storage/process limit | On | 防止shared platform耗盡 |
| Admin action audit | On | 誰停用／改policy必須可追查 |
| Block cloud metadata、control plane及private admin network | On | 保護公司基建，唔係限制題材 |
| Prompt body retention | Off | privacy-first |
| Topic/content filter | Off | 符合coding freedom |
| Extension allowlist | Off | 只在有事故或法規要求時啟用 |
| Repo allowlist | Off | user自由create/import |
| General internet egress allowlist | Off | 保持開發能力；敏感zone可另設profile |
| Code scan blocking | Off | POC只report；IT handover附scan結果，由IT正式SDLC決定gate |
| IT handover submission | On | 唯一離開POC平台嘅受管出口；唔等於production approval |
| AI hard budget cap | Off | soft alert預設；runaway ceiling仍on |

---

## 8. Resource allocation與concurrency spike

### 8.1 起始resource profiles（係測試假設，唔係保證值）

| Profile | CPU request / limit | RAM request / limit | Disk | 用途 |
|---|---:|---:|---:|---|
| Light | 0.5 / 2 vCPU | 2 / 4 GiB | 10 GiB | small UI/docs |
| Standard | 1.5 / 4 vCPU | 4 / 8 GiB | 20 GiB | React + FastAPI + agent |
| Heavy | 3 / 8 vCPU | 10 / 16 GiB | 50 GiB | multi-service/build/data |

Kubernetes ResourceQuota可以按namespace限制aggregate CPU、memory同object count，避免一個team食晒shared cluster。[8]

### 8.2 Capacity公式及30–50 concurrent target

```text
raw CPU demand = Σ(active workspaces by profile × CPU request)
raw RAM demand = Σ(active workspaces by profile × RAM request)
node count = ceil(max(raw CPU / CPU target capacity,
                      raw RAM / RAM target capacity)) + 1 N+1 node
```

Capacity planning由而家開始以 **30–50名developer同時active** 作正式design envelope，而唔係只按registered users。壓測假設Light/Standard/Heavy比例50%/40%/10%，正確加權每workspace係：

```text
CPU  = 0.5×50% + 1.5×40% + 3×10%  = 1.15 vCPU
RAM  = 2×50%   + 4×40%   + 10×10% = 3.6 GiB
Disk = 10×50%  + 20×40%  + 50×10% = 18 GiB
```

| Concurrent active workspaces | Raw weighted requests | 16 vCPU / 64 GiB workspace nodes（含N+1） |
|---:|---:|---:|
| 30 | 34.5 vCPU / 108 GiB | 約5 nodes |
| 40 | 46 vCPU / 144 GiB | 約6 nodes |
| 50 | 57.5 vCPU / 180 GiB | 約7 nodes |

計算假設每個16/64 node allocatable `14 vCPU / 56 GiB`，只用到CPU 70%、RAM 75%作scheduling target，再加1個N+1 node；target utilization已經係headroom，唔再重複乘30%。如改用32 vCPU / 128 GiB node並假設allocatable `28 vCPU / 112 GiB`，50 concurrent數學下限約4 nodes（已含N+1），但實際應由fragmentation、workspace startup/build burst、daemon overhead及node failure測試決定，可能要5 nodes。

因此建議workspace node pool配置成autoscaling range，而唔係一次買死固定數量：

- 正常工作時段pre-warm至可承受30 concurrent；
- autoscale至50 concurrent target；
- contingency load test做到80 concurrent，但唔需要長期保留全部capacity；
- build pool同workspace pool分開，避免`npm`／Docker build搶走interactive IDE CPU。

Storage用以下公式，因為係按registered workspace而唔係concurrency：

```text
storage = registered workspaces × weighted average disk × snapshot/retention factor
```

例如100個workspace、加權18 GiB、加30% buffer係2,340 GiB，約2.29 TiB，未計registry/object-store/DB。Kubernetes requests/limits會直接影響scheduling及資源爭用，所以以上全部係load-test起點，唔係供應商容量保證。[16]

### 8.2.1 Kubernetes distribution決策

對30–50 simultaneous developers，正式scale stage需要Kubernetes或同級scheduler；但**distribution由hosting ownership決定，唔預設一定managed亦唔預設一定K3s**：

| Hosting/operations reality | 建議 |
|---|---|
| Azure/AWS/GCP，而且公司已有成熟AKS/EKS/GKE team | 用既有managed Kubernetes；唔在VM上另起K3s |
| 公司自有香港Ubuntu VM／bare metal／private cloud，並願意負責upgrade、etcd、CSI、CNI、LB同backup | K3s係合理baseline |
| Stage 0 compatibility spike | 單一K3s server或現有test cluster，2–5 workspace即可；唔先建HA |
| K3s production-like pilot | 3個tainted server/control-plane nodes + embedded etcd，workspace/build/system分agent pools |

K3s官方HA embedded-etcd設計使用三個或以上server nodes，並要求相同critical flags；慢disk會影響etcd。[46] K3s minimum sizing唔包括user workloads，官方亦明示datastore performance依賴disk並建議SSD；本平台容量瓶頸會係workspace/build CPU、RAM、storage同image traffic，而唔係K3s可否支援幾個agent nodes。[47]

無論managed K8s定K3s：

- user workspace唔排上control-plane/system nodes；
- 每workspace使用獨立service account、quota、NetworkPolicy及PVC；
- workspace、build、system分node pools；detached preview pool到真正需要先加；
- Git係source durability，PVC係working filesystem，object storage保存snapshot/artifact；
- K3s local-path storage唔作重要persistent data唯一副本；
- production-like K3s要etcd snapshot/restore、upgrade、node replacement、CSI/LB/CNI同certificate runbook。

Kubernetes唔會自動解決backup、DB migration、WebSocket session或kill switch；呢啲仍由PostgreSQL、object storage、migration tooling同session control設計負責。

### 8.3 Spike策略

- 9am前pre-warm nodes同template images；
- 預留10–20% warm workspace slots；
- launch、build、preview/handover分queue，唔好互相搶node；
- build用獨立ephemeral build pool；
- admission queue顯示排隊位置／ETA，唔係直接timeout；
- 壓力時先deprioritize background agents，保住interactive editor；
- Cluster Autoscaler增加nodes；KEDA可按queue或external event scale deployment/job，而唔只靠CPU。[9][17]
- **唔好對單一user workspace做HPA複製**：workspace係有identity/PV嘅stateful unit；應scale provisioner workers及workspace nodes，唔係將同一IDE複製成多個replica。
- 起動queue、unschedulable pods同工作時間預測共同驅動capacity；node scale-up慢過pod scheduling，所以要有pre-warm。

### 8.3.1 Capacity admission同user experience

**Workspace資源用盡時唔應阻止user登入。** Portal／SSO／admin／kill switch運行在獨立system pool並保留capacity；user仍可登入查看project、cost、queue同handover，只係暫時唔可以start新workspace。

Workspace start state machine：

```text
REQUESTED -> CAPACITY_QUEUED -> PROVISIONING -> READY
                         |          |
                         +-> CANCELLED / FAILED
READY -> SUSPENDED -> CAPACITY_QUEUED / PROVISIONING
```

Admission Controller在建立workspace前檢查：

- resource class仲有冇schedulable slot；
- namespace/team/user quota；
- compatible runtime/node pool；
- PVC/storage quota；
- provider IP/node quota及autoscaler max；
- template image/runtime availability。

冇capacity時：

1. API回傳明確`CAPACITY_QUEUED`，唔係HTTP 500或假裝login failure；
2. UI顯示所需resource class、queue position、queued age、估算ETA及取消按鈕；
3. 仍然running嘅workspace保持可reconnect，唔因新request過多而踢走existing users；
4. slot ready後建立短期reservation lease，並透過in-app + email／Teams／webhook通知user；
5. lease逾時就公平釋放俾下一位；
6. queue採team-aware FIFO／fair-share，priority override只限有audit reason嘅break-glass操作。

如果control plane本身故障，先顯示獨立status page；唔好將「workspace capacity full」同「平台login失敗」混成同一錯誤。

### 8.3.2 Monitoring、capacity warning同operations alert

採Prometheus + Alertmanager + Grafana；Loki保存可搜尋logs，OpenTelemetry連接API、provisioning及workspace-start traces。Prometheus metrics按template、resource class、runtime、node pool及status聚合；user/workspace ID留在logs/traces，避免high-cardinality labels。

最少metrics：

- `workspace_slots_available`／`workspace_slots_total` by resource class；
- running、starting、queued、failed、suspended workspace counts；
- queue depth及oldest queued age；
- workspace start至IDE-ready p50/p95/p99；
- node requested/allocatable CPU、RAM、ephemeral storage；
- unschedulable pods、autoscaler desired/max nodes、node provisioning time；
- image pull、PVC attach、sandbox boot、IDE readiness各階段duration；
- CPU throttling、OOM、eviction、disk pressure；
- active WebSockets、abnormal closes、reconnect time、proxy open connections；
- PostgreSQL connection pool、query latency、Redis errors；
- preview/build queue同registry failure；
- cost per active workspace-hour。

初始alert policy（要由load test再調）：

| Severity | Condition | Action |
|---|---|---|
| Warning | 可用workspace slots低於20%持續15分鐘 | 通知platform team、檢查pre-warm／provider quota |
| Critical | 可用slots為0且queue非空持續2分鐘 | Pager／Teams alert，觸發capacity runbook |
| Warning | oldest queued age超過5分鐘 | 檢查node launch、image pull、PVC及quota |
| Critical | autoscaler到max而仍有unschedulable pods超過5分鐘 | 提升已批准capacity或啟動admission cap |
| Warning/Critical | Workspace start failure rate超過5%／10% | 按template/runtime/node pool切分定位 |
| Warning/Critical | PVC/storage超過80%／90% | 通知user cleanup，必要時暫停新workspace |
| Critical | Login、admin revoke或kill-switch API失效 | 獨立P1；workspace飽和不可拖垮control plane |
| Warning | WebSocket abnormal close／reconnect明顯上升 | 檢查ingress timeout、drain及proxy容量 |

Ops alert同user notification係兩條channel：Ops收到容量／故障alert；排隊user只收到清楚狀態、ETA及slot-ready通知，避免將內部infrastructure alarm直接轟炸所有developer。所有alert需有owner、runbook URL、deduplication同resolved通知。

### 8.4 Load balancing

- Portal/API保持stateless，至少2 replicas；一般唔需要sticky session。
- Workspace Router按workspace ID固定route到該workspace，完整支援WebSocket/SSE。Proxy容量按weekly peak預留；graceful drain及重連先完成，唔好為慳少量成本進行激進scale-down而斷IDE session。
- LiteLLM至少2 replicas，PostgreSQL/Redis外置；provider-level rate limit、fallback同circuit breaker。
- Build/preview/handover worker由durable queue拉job，支持idempotency同retry。
- PostgreSQL、object storage、registry同template Git均需backup/restore演練。
- Production target可用3個control-plane replicas、跨failure-domain spread同PDB；workspace pool保留N+1。但唔應宣稱單一IDE workspace可以零中斷failover：未commit filesystem state、terminal process同WebSocket都可能中斷，必須以Git、snapshot同清楚RPO復原。

---

## 9. Vibe-code platform production load test plan

### 9.1 必測場景

1. **Morning storm**：5分鐘內30個workspace start，並維持50個active workspaces。
2. **Interactive steady state**：50 developers同時使用IDE／terminal／agent，另加50條POC preview routes。
3. **AI spike**：50 concurrent streaming LLM requests；測TTFT、fallback、budget attribution、provider 429。
4. **Build storm**：10 concurrent multi-stage builds，證明唔拖慢editor。
5. **Preview/handover storm**：10 concurrent POC preview deploys + 5 handover package builds；平台冇production deploy scenario。
6. **Noisy neighbour**：一個workspace CPU/RAM/process/disk爆滿，其他workspace不受影響。
7. **Node loss**：workspace node、control-plane pod、LiteLLM replica、build worker逐一故障。
8. **Revoke test**：disable user後60秒內session、workspace route、AI key同deploy permission失效。
9. **Template rollback**：新template release失敗，可停止adoption及回復上一版。
10. **Restore drill**：從backup復原platform metadata及一個workspace/project。
11. **Capacity exhaustion**：人為限制node pool，證明user仍可登入、start request進入`CAPACITY_QUEUED`、UI顯示queue/ETA、Ops alert觸發、slot增加後user收到通知並成功啟動。
12. **Alert delivery**：驗證Warning/Critical routing、dedup、silence、resolved通知及runbook link，唔只驗證Prometheus rule expression。
13. **Partial failure isolation**：依次停止Langfuse、LiteLLM provider、control API、RabbitMQ node／worker、WebSocket proxy及preview process，證明不相關IDE/source仍可用，unacked job redeliver、outbox可reconcile或進入明確`NEEDS_USER_ACTION`。
14. **Self-heal drill**：故意製造dependency/build/preview failure，驗證Failure Capsule、checkpoint branch、`Heal in Workspace`、retry同rollback；agent不得取得platform權限。
15. **Edge/WebSocket soak**：經真WAF/LB維持8–24小時IDE terminal、SSE、agent stream及preview；測idle timeout、drain、reconnect、large upload同wildcard routing。
16. **Network isolation**：workspace嘗試連cloud metadata、control/data/management CIDR必須被拒；一般Git/package/model egress按policy成功並有identity/bytes audit。
17. **AZ/DR failover**：逐一故障API AZ、RabbitMQ node、PostgreSQL primary、ingress node；另做warm-passive regional runbook，驗證fencing、RPO/RTO同DNS切換。
18. **Port broker exhaustion**：重複使用相同container ports、route create/delete race、TTL expiry及optional raw-TCP pool耗盡都唔可錯配到另一workspace。
19. **HK office WAN failure**：分別切斷site primary ISP、back-office firewalls/Internet、private DNS/AD connector及一個HK facility；驗證site secondary path、local breakout、WebSocket reconnect、alternate IdP/DNS及無人手改site firewall嘅DR切換。
20. **Mobile asynchronous task**：提交後lock/close browser、切WAN、kill runner、重開PWA；驗證task server-side繼續或明確recover、event sequence補齊、idempotent submit、scoped approval、Stop、checkpoint、diff/test/preview及PR flow。
21. **App Package install/upgrade**：對fresh、上一版template同已有改動project安裝/升級Company SSO；驗證dependency resolution、compatibility fail-closed、codemod idempotency、migration、negative AuthZ E2E、remove dry-run、blocked digest同existing app唔被silent修改。

### 9.2 初始SLO targets

- Portal/API availability：99.9%（平台production phase；唔代表generated app）；
- warm workspace p95 usable < 90秒；
- cold workspace p95 usable < 4分鐘；
- ready service preview route < 10秒；
- admin revoke effect < 60秒；
- usage/cost dashboard delay < 5分鐘；
- capacity不足時start API在2秒內回傳`CAPACITY_QUEUED`，唔出generic error；
- slot ready後user notification在1分鐘內送出；
- capacity critical condition達門檻後2分鐘內送到on-call channel；
- mobile agent submit API在2秒內durably回傳task ID／`ACCEPTED`，唔等agent完成；
- mobile重連後5秒內取得authoritative snapshot並補回event gap；
- `REVIEW_READY`／`NEEDS_USER_ACTION`後1分鐘內發notification；
- `Stop` intent在2秒內persist，healthy runner在10秒內停止發出新tool calls；
- control-plane deployment不終止running workspace。

Load test用k6/Locust；LLM大部分用deterministic stub，另做少量真provider canary，避免壓測燒token成本。

---

## 10. Evaluation plane：score、code graph同God Object

需要，但**Graphify唔應成為唯一評分器**。Graphify用Tree-sitter／semantic extraction建立queryable code knowledge graph，會輸出graph/report並標示高degree「God Nodes」；呢個適合導航、impact analysis同找候選hotspots，但高degree node唔等於已證實God Object。[23]

### 10.1 評估架構

```text
Git SHA + requirements + risk tier
  -> Evaluation Orchestrator
  -> deterministic runners in isolated containers
     +-- build/lint/type/test
     +-- Graphify/dependency graph
     +-- SonarQube/ESLint/Radon quality metrics
     +-- Semgrep/CodeQL/Gitleaks/Trivy security
     +-- Playwright/API/business-rule tests
     +-- migration/seed/Compose/runtime probes
  -> normalized evidence
  -> policy decision + maturity score + confidence
  -> Failure Capsule / dashboard / IT handover
```

Evaluation runners只讀取clean immutable checkout，冇workspace、production或platform credential。Raw SARIF／JSON／HTML/report artifacts放S3/MinIO，PostgreSQL只存normalized findings、fingerprint、tool/ruleset version、target SHA、exit code、coverage及artifact URI。

### 10.2 God Object detection

唔可以因為「最大file」或者Graphify degree最高就直接判God Object。至少組合：

- file/class lines of code；
- method/property count；
- cyclomatic及cognitive complexity；
- fan-in／fan-out；
- dependency graph degree、betweenness、PageRank；
- lack of cohesion（LCOM）或跨domain responsibilities；
- Git change coupling／多人經常一齊改嘅files；
- test blast radius；
- React giant `App.tsx`、NestJS giant service/module、FastAPI giant router/service等stack-specific signatures。

SonarQube可提供complexity、duplication、issues等metrics，但係quality governance工具，唔係architecture/business correctness證明。[27] Graphify負責graph evidence；deterministic metrics負責候選排序；AI reviewer解釋responsibilities；human／approved architecture rule先作最終判斷。

### 10.3 Decision同score要分開

每次evaluation輸出三項：

1. **Promotion decision**：`PASS | CONDITIONAL | NO-GO | QUARANTINE | UNKNOWN`；
2. **Maturity score**：0–100，只在hard gates及required evidence齊全後計；
3. **Evidence confidence**：Measured／independent review／owner assertion／missing。

POC quality初始權重：

| Domain | Weight |
|---|---:|
| Requirements + runtime correctness | 25 |
| Architecture + coupling | 20 |
| Maintainability | 15 |
| Security + data handling | 15 |
| Tests + failure recovery | 15 |
| Operability + handover | 10 |

Hard gates不能被其他分數補償：secret exposure、要求登入但冇server-side auth、tenant/data leakage、migration destroys data、build/scanner failure當pass、critical business rule冇oracle，都必須`NO-GO`或`UNKNOWN`。缺證據唔係0分，係`Not measured`，亦唔可以宣佈winner。

### 10.4 Batch evaluation cadence

- 每個PR：fast deterministic diff lane；
- 每個preview／handover：完整build、migration、seed、runtime、Playwright及scan lane；
- 每週：full repository quality/security graph refresh；
- Template release：上一版對比，檢查score regression、new God Object candidate、dependency cycle同route/auth drift；
- 高風險handover：CodeQL/Joern deep lane + human architecture/business review。

Evaluation結果首先report-only；量度false-positive／false-negative後，只讓deterministic、已驗證嘅critical policies auto-block。

---

## 11. Main platform tech stack

Project template繼續React/Vite + FastAPI + SQLAlchemy + SQLite，**唔代表platform control plane一定要用同一stack**。Template係user app contract；platform係long-lived WebSocket、job orchestration、policy及multi-tenant control system，演進速度同failure domain不同。

### 11.1 建議stack

| Layer | Recommendation |
|---|---|
| Portal | React + Vite + TypeScript；internal SPA冇SSR需要，唔必用Next.js |
| Control API | NestJS + Fastify adapter + TypeScript |
| Data | PostgreSQL + Prisma（或團隊已有標準ORM） |
| Durable execution | PostgreSQL job/outbox作business truth + RabbitMQ quorum queues作execution broker |
| Realtime status | NestJS WebSocket/SSE；只傳平台status/notification |
| IDE/terminal traffic | Coder/workspace proxy + Envoy/Traefik，唔經NestJS轉發所有terminal bytes |
| Artifacts | S3/MinIO |
| Workspace orchestration | Coder + Kubernetes controllers |
| Evaluation workers | Python container workers跑Graphify/NetworkX及其他CLI；唔放入main API process |
| AI | LiteLLM + Langfuse |

RabbitMQ係execution transport；PostgreSQL保存job state/outbox，reconciler在broker delivery uncertain或worker失聯後重新publish，避免broker成為唯一business truth。

### 11.2 NestJS vs FastAPI

**建議main platform用NestJS，唔係因為FastAPI慢，而係組織及workload fit較好：**

- 前後端同TypeScript，DTO/event/schema/shared client生成較直接；
- NestJS modules、guards、interceptors、WebSocket同message-consumer integration適合control plane；
- Fastify adapter係Nest官方提供嘅performance option。[24]
- Node event loop適合大量I/O-bound API、queue、WebSocket，但CPU-heavy工作會block event loop，所以graph analysis、build、scan、LLM post-processing要丟去worker/process。[25]

FastAPI亦支援async I/O同多worker deployment，Python GIL唔代表FastAPI只能逐個request處理；官方部署方式可用多個worker process利用多核。[26] 如果公司backend team明顯Python較強，繼續FastAPI完全可行，RabbitMQ可配Dramatiq／Celery consumer。

### 11.3 Threading、concurrency、performance結論

30–50 concurrent developers唔會令NestJS或FastAPI API framework成為主要瓶頸。真正瓶頸係：

1. workspace CPU/RAM/PVC；
2. image pull同Compose startup；
3. build concurrency；
4. LLM streaming/provider limits；
5. WebSocket proxy capacity；
6. PostgreSQL connection/reconciliation design。

唔在API process開thread處理build/Graphify/scan。API只validate、persist command、enqueue及stream status；worker水平擴展。NestJS API保持stateless，多replica；CPU-heavy evaluation使用獨立Python worker pool。最終用k6/real workspace load test比較p95、memory、event-loop lag、DB connections及job latency，唔用hello-world benchmark揀framework。

### 11.4 Node、Python、Java runtime trade-off

| Runtime | Concurrency／CPU | Memory／GC | 建議角色 |
|---|---|---|---|
| Node/NestJS | 每個V8 isolate一條JS execution thread；I/O concurrency強。Worker Threads可parallel CPU，但官方亦建議主要用於CPU-intensive JS，唔係一般I/O。[32] | V8 GC自動；每個worker isolate有獨立heap，開大量workers會增加memory及診斷複雜度 | Stateless control API、WebSocket status、orchestration |
| Python/FastAPI | Async I/O可並發；standard CPython GIL限制同一process內pure-Python CPU threads，CPU parallel通常靠process/native extension。[33] | AI/scanner ecosystem最好，但large graph／multiprocessing可有較高RSS；用短命worker/K8s Job同memory limit隔離 | Graphify、evaluation、ML/analysis workers |
| Java/Spring Boot | JVM真multi-thread、可在單process有效使用多core；適合CPU及大量concurrent workflows | GC選擇、heap tuning及profiling最完整，但baseline memory、startup同platform複雜度通常較高 | 只有公司已有Java platform team，或實測Node control plane成為CPU/memory瓶頸先採用 |

Node Worker Threads API本身唔難，難處係production lifecycle：pool sizing、memory per isolate、timeout/cancel、crash replacement、trace context、backpressure同deployment drain。呢個平台唔需要靠Worker Threads救API performance；CPU工作本身已經係durable RabbitMQ job，直接用獨立worker pod／Kubernetes Job更易隔離同水平scale。

Scale策略：

- NestJS API pods保持細而stateless，約1–2 vCPU級別起步，靠HPA/replicas scale out；
- RabbitMQ consumers按queue depth同oldest age scale out；
- Python evaluation workers按tool/runtime class獨立scale及定期recycle；
- Build/Compose用ephemeral Kubernetes Jobs；
- Java只因現有team能力、已驗證SLO或CPU-heavy domain採用，唔為「GC可能更好」引入第三個main backend stack。

Horizontal scaling仍係HA邊界；就算Java可以vertical scale用晒多核，都要至少多replica跨node。30–50 developers下，選NestJS唔會因single JS thread而成為問題，前提係唔將build、scan、graph分析或terminal proxy塞入API event loop。

---

## 12. Data model

最少需要：

- `users`, `teams`, `role_bindings`, `sessions`；
- `templates`, `template_versions`, `template_channels`, `template_compatibility`；
- `projects`, `project_passports`, `workspaces`, `workspace_snapshots`；
- `port_routes`, `poc_previews`, `preview_revisions`, `handover_packages`；
- `virtual_key_refs`, `usage_events`, `daily_cost_rollups`, `budgets`；
- `policy_definitions`, `policy_scopes`, `policy_changes`；
- `audit_events`；
- `build_jobs`, `preview_jobs`, `handover_jobs`, `outbox_events`。
- `evaluation_runs`, `evaluation_artifacts`, `evaluation_findings`, `evidence_items`；
- `quality_scorecards`, `promotion_decisions`, `graph_metrics`, `god_object_candidates`。
- `network_policy_profiles`, `egress_audit_rollups`, `raw_port_leases`, `failover_events`, `dr_drill_results`。
- `agent_tasks`, `agent_runs`, `agent_messages`, `agent_events`, `agent_checkpoints`, `agent_approvals`, `agent_artifacts`, `notification_subscriptions`。
- `app_packages`, `app_package_versions`, `app_package_artifacts`, `app_package_dependencies`, `app_package_compatibility`, `project_package_installs`, `package_install_runs`, `package_approvals`。

Audit event至少有actor、action、target、scope、timestamp、request ID、before/after policy、result同reason；prompt body唔應直接混入admin audit table。

---

## 13. CI/CD design

CI/CD要分五條pipeline，因為platform、template、app package、generated POC同IT handover嘅trust level完全唔同。

### 13.1 Platform pipeline

```text
PR
 -> format/lint/type/unit tests
 -> API/DB/queue integration tests
 -> migration fresh-upgrade + previous-version upgrade
 -> security/IaC/policy checks
 -> build immutable OCI images
 -> SBOM + vulnerability scan + sign/attest
 -> deploy platform staging by digest
 -> desktop/mobile viewport、WebSocket reconnect、agent task、workspace/revoke/capacity E2E
 -> canary platform release
 -> SLO/alert verification
 -> promote same digest
```

- Platform deployment用GitOps（Argo CD／Flux或等價工具）；CI更新staging/prod desired-state repo，cluster自行reconcile。Argo CD本身採Git作desired-state source並持續比較live state。[22]
- build一次、按image digest promote，唔可以每個environment重新build；
- database schema使用expand/contract；migration先同old/new app兼容，再deploy code，最後另一次release移除舊欄位；
- rollback主要係回退image/config；如schema/data migration不可逆，就用forward fix或已驗證backup restore，唔假裝`alembic downgrade`一定安全；
- CI用OIDC workload identity，冇長期cluster-admin token；GitHub Actions OIDC可用短期cloud token取代長期secret。[21] Production environment有獨立least-privilege deploy identity。

### 13.2 Template pipeline

每個template PR要：

1. Validate manifest/schema、semantic version、image digest、resource/runtime class；
2. 在source tree跑backend/frontend tests；
3. Render全新example到獨立temporary directory；
4. Clean locked installs：`npm ci`同frozen Python install；
5. Alembic fresh database upgrade到head；
6. 由上一個supported template/database revision升級；
7. 驗證seed run兩次都唔產生duplicate data；
8. `docker compose config`、build、one-shot migrate、optional seed、readiness；
9. 經reverse proxy跑API／SPA／WebSocket／Playwright critical path；
10. Reject `hostPort`、`hostNetwork`、public DB/cache exposure、platform-reserved port collision同undeclared preview route；
11. SBOM、secret scan、vulnerability scan、license report；
12. 發布immutable candidate version；
13. Canary workspace驗證後先promote到`stable` channel。

Template update只影響新workspace；existing project收到Template Delta Update branch，唔會自動覆蓋。Dependabot/Renovate、base-image/security scan只建立candidate PR；冇測試就唔自動promote。

### 13.3 App Package pipeline

每個App Package/version要：

1. Validate manifest、semantic version、compatibility matrix、permissions、conflicts、upgrade/remove metadata；
2. 驗證所有package/image/codemod以digest/lock固定，產生SBOM、provenance、signature；
3. 在每個supported template/version render clean project，再安裝package；
4. Codemod/installer重跑不得duplicate route/config/migration；unsupported project必須fail closed為`MANUAL_ADAPTATION_REQUIRED`；
5. Fresh install、supported-version upgrade、base-template upgrade + package共存、remove/decommission dry-run；
6. Build/lint/type/unit/migration/Compose/Playwright；
7. Security packages額外跑negative E2E。例如SSO測invalid state/nonce、expired session、role denied、disabled user、frontend bypass仍被backend拒絕；
8. Secret scan確認artifact/repo/evidence冇client secret；test只用mock IdP/placeholder；
9. 發布signed candidate，喺canary projects開install/upgrade PR；
10. Evidence通過先promote `stable`；critical regression可將digest標`blocked`，但唔silent改已merge app。

### 13.4 Generated POC project pipeline

Generated repo每次push：

```text
format -> lint -> types -> unit/component tests
 -> migration/seed contract tests
 -> compose/build/readiness
 -> POC browser smoke
 -> SBOM/scan/report
 -> optional POC preview by digest + TTL
```

- 只部署POC preview/UAT；pipeline冇production environment、production credential或production deploy permission；
- failure保存logs/trace並產生Failure Capsule，IDE保持可用；
- preview按Git SHA/image digest識別，有owner、TTL、resource limit及rollback；
- scan預設report-only供POC修復，結果必須放入IT handover package。

### 13.5 IT handover pipeline

Handover唔係deployment pipeline。佢只建立、驗證及簽署package：

- immutable source Git SHA；
- template/version/locks；
- migrations及synthetic seed；
- tests/build evidence；
- SBOM、scan、known gaps；
- POC image digest及observed resource profile；
- data classification、secret inventory references；
- runtime/reproduction steps；
- checksum/signature及IT receipt status。

IT接收後在IT-owned enterprise repo及正式SDLC重新設計production CI/CD；唔直接promote POC image。

### 13.6 CI failure、cleanup同rollback

- Every job有timeout、cancel、retry policy同artifact retention；
- `always` cleanup收集Compose/K8s logs後清除isolated test namespace/volume，唔碰user或shared data；
- migration、seed、queue、preview deploy均有idempotency test；
- failed canary自動停止promotion，但唔自動roll back database data；
- deployment event記source SHA、image digest、config digest、migration revision、actor、result及rollback target；
- 定期故意測試runner failure、registry timeout、DB migration failure、alert delivery同restore，而唔只測happy path。

---

## 14. Delivery roadmap：先交付有用產品，再逐層加north-star能力

上文係target architecture／design envelope，唔代表所有components都要喺MVP部署。完整scope實際包含workspace platform、AI gateway、async agent、POC handover、security/evaluation及HA/DR幾條product streams；如果要全部落地，應視為6–9人專責team、約9–18個月programme。第一個有用版本可以早好多，但必須削scope。

### Stage 0 — Feasibility spike（4–6週，2–3 experienced engineers）

只證明五個會令整個方案成立或失敗嘅問題：

1. Coder workspace在目標環境（現有managed K8s或單一K3s spike cluster）可可靠create/start/stop/recreate；
2. pinned code-server + Cline完整workflow真係可用：activation、webview、terminal approval、checkpoint、attachment、OAuth callback、LiteLLM streaming/tool calls；
3. Cline -> LiteLLM -> approved model嘅streaming、large context、tool calling、vision（如需要）、virtual key/revoke可用；
4. 一個React/Vite + FastAPI golden template可即開即用，Frontend/API經authenticated Coder Apps preview；
5. Stop/start/recreate workspace後Git/source不失，workspace isolation、PVC同basic egress boundary成立。

Go/no-go evidence：固定版本、重現script、真browser workflow錄證、failure log、resource baseline同license/edition matrix。**唔在Stage 0同時做**mobile、OpenHands multi-agent、RabbitMQ、arbitrary Compose、microVM、Graphify score、detached preview、DR、office dual-WAN或50-user load。

如果只有一兩個developer兼職做，Stage 0要重估為2–4個月，唔將4–6週當承諾。

### Stage 1 — V0 usable pilot（再4–6週，5–10 users）

- Company SSO登入vibe portal；
- 一個golden workspace/project template；
- React/Vite thin portal只做Projects、New Project、Project、Handover四個主要screens；
- Portal調Coder API建立/啟停workspace，再redirect到Coder/code-server，唔重造Coder UI/scheduler；
- Git repo create/import、source persistence；
- Coder Apps authenticated Frontend/API preview；
- LiteLLM virtual key、basic usage/revoke；
- basic audit、workspace idle stop；
- handover package最小版：source SHA、dependency lock、tests/build、run instructions、known gaps。

Architecture只需要React/Vite、NestJS/Fastify、PostgreSQL、Coder、LiteLLM、Git/CI。冇RabbitMQ，Redis只在有具體session/cache需求先加。

### Stage 2 — V1 internal platform（再6–8週，10–20 users）

- Project/template catalog、immutable template version；
- App Package Catalog + Composer；第一個`Company SSO` app package可scaffold-time選擇及post-create PR安裝；
- remote BuildKit、basic SBOM/secret/dependency/container scan；
- AI/compute usage dashboard、soft budget、metadata audit；
- one-click IT handover evidence；
- monitoring、backup/restore、stable error codes、Error Boundaries；
- quota、idle policy、workspace archive/delete grace；
- template/package CI同upgrade branch；
- security/edition gaps有明確owner同採購/自建決策。

仍用Coder Apps做preview；仍未做server-side async agent、mobile PWA、detached preview、arbitrary Compose或0–100 evaluation score。

### Stage 3 — V1.5 scale and hardening（再4–8週，逐步到30–50 concurrent）

- Hosting decision落實：既有cloud team用managed K8s；自有Ubuntu/private cloud可用3-server embedded-etcd K3s；
- system/workspace/build node pools、N+1、capacity admission、pre-warm、autoscaling；
- 30 normal、50 target、80 contingency mix load test；
- default-deny NetworkPolicy、egress boundary、WAF/LB/WebSocket soak；
- workspace resource/queue UX、capacity alerts；
- backup/restore、node failure、control-plane upgrade、PV recovery drills；
- HK office local breakout/secondary path、DNS/IdP dependency及WAN monitoring baseline；
- SLO、on-call、cost/capacity dashboard。

只在呢一stage先fund 30–50 user capacity；唔在Stage 0先買足所有nodes。

### Stage 4 — V2 asynchronous agent product（再8–12週，selected users）

- PostgreSQL durable task/job truth + transactional outbox；
- RabbitMQ quorum queues、idempotent workers、lease/heartbeat、retry/DLQ/reconcile；
- AgentAdapter + Codex/Cline CLI/OpenHands adapters；
- per-task branch/worktree、checkpoint、plan/approval、Stop/cancel；
- event sequence/reconnect replay、diff/tests/artifacts、PR；
- Failure Capsule、Rescue Workspace、budget/risky-action approval；
- notification backend。

呢度先正式需要RabbitMQ；唔將V2 architecture masquerade成V1 requirement。

### Stage 5 — V2.5 mobile agent UX（再4–6週）

- PWA task inbox/composer；
- plan approval、timeline、Stop、follow-up；
- mobile diff/test/preview review、create PR；
- Web Push／Teams/email；
- browser lock/close/WAN switch後task繼續及event replay；
- voice/screenshot/spec attachment可後加。

Mobile係agent product client，唔同workspace MVP綁同一deadline。

### Stage 6 — V3 adoption-driven capabilities

只在真實usage證明需要後加入：

- workspace休眠後仍可分享嘅detached POC preview、TTL、rollback；
- arbitrary Docker Compose microVM/Kata/private-daemon sandbox；
- richer App Packages及curated bundles；
- Graphify、God Object、architecture/evaluation score；第一版仍只提供raw evidence；
- advanced Project Passport／Time Machine；
- warm-passive HK DR、facility fencing/DNS failover；
- natural-language bootstrap、multi-agent conflict detection；
- policy-as-config UI同更深FinOps/showback。

### Funding／governance gate

每stage要有adoption、failure、cost、security及support evidence先進下一stage。對management應稱為 **AI Development Workspace Platform**：產生traceable POC及IT handover，唔係讓citizen developer直接產生production system。

---

## 15. Key decisions and risks

1. **Cline browser compatibility**：最大早期技術風險；一定要POC，唔好靠extension name推斷。
2. **Coder license/edition**：SSO、RBAC、audit、HA等所需功能要逐項做OSS vs commercial matrix。
3. **Arbitrary Compose**：唔可獲host Docker權限；rootless/sandbox或remote build係hard boundary。
4. **SQLite**：適合local/simple app，唔適合平台control plane或多replica production。
5. **Prompt audit privacy**：metadata-only預設；full capture必須明示、加密、短retention、細RBAC。
6. **Template upgrade conflicts**：只可開branch／PR或codemod；禁止silent overwrite。
7. **Cost accuracy**：LiteLLM/Langfuse數據要同provider invoice reconciliation。
8. **Generated code risk**：topic自由唔等於shared-infra無隔離；阻擋metadata/private control-plane access係必要平台安全。
9. **Vendor lock-in**：project必須可export、local Compose可run、agent/gateway用OpenAI-compatible interface。
10. **Backstage scope creep**：V1先做精簡catalog；當service數量、ownership、TechDocs、plugin需求真係出現先引入完整Backstage。
11. **RabbitMQ operations**：quorum queue唔代表免運維；要測publisher confirm、consumer redelivery、node loss、network partition、disk alarm、DLQ replay及outbox reconciliation。若公司冇broker operational ownership，優先managed RabbitMQ或明確on-call/runbook，唔好用Kafka增加更多複雜度。
12. **HK-only correlated risk**：兩個香港facility可處理building/carrier/DC failure，但唔係真正geographic disaster isolation；territory-wide outage、同一cloud control-plane故障或共同carrier dependency要列為accepted residual risk，除非日後批准境外DR。
13. **Codex integration maturity/auth**：`codex exec --json`先經adapter；App Server remote WebSocket現時experimental，唔直接暴露。每user credential／organization gateway、subscription/API entitlement、data handling同commercial terms要獨立驗證，禁止共享一個員工OAuth profile。
14. **Mobile approval risk**：手機細屏唔適合一次approve巨大diff或高風險deploy；大變更只顯summary唔代表已review。Production side effect、secret access、destructive migration必須step-up及separate release approval。
15. **App Package supply chain**：packages包含code、migration、codemod或sidecar，全部都係dependency/code-execution入口；禁止user上傳未審核package、floating `latest`、arbitrary postinstall同secret embedded artifact。每版要digest、SBOM、signature、permission manifest、canary、block switch及owner。
16. **SSO package唔係純UI component**：login button成功唔代表AuthZ正確；package必須有backend denial tests、session/nonce/state handling、獨立IdP registration及secret reference。Compatibility unknown就fail closed，唔由agent估住裝。
17. **Interview-scale overengineering**：唔將百萬RPS、全域strong consistency、99.999%或全endpoint 50 ms當無證據要求；先用30–50 developer真實mix同failure drill量度。自行寫consensus/memory log/vector clocks會增加資料遺失、split-brain同operation risk，而唔會改善核心user journey。

---

## 16. 建議立刻執行嘅下一步

1. 批准Stage 0五項feasibility spike，唔承諾完整north-star平台。
2. 確認hosting reality：公司已有managed Kubernetes team，定自有Ubuntu/private cloud要試K3s。
3. 只建立2–5 workspace spike cluster；唔先買30–50 user capacity。
4. Pin並記錄Coder、code-server、Cline、LiteLLM版本同license/edition。
5. 建立React/Vite + FastAPI/SQLAlchemy/SQLite golden template，Frontend/API用authenticated Coder Apps開啟。
6. 真browser跑完整Cline workflow：edit、terminal approval、checkpoint、attachment、tool call、large context、error/retry。
7. 測workspace stop/start/recreate、Git push/restore、PVC、workspace-to-workspace isolation及basic egress deny。
8. 量度workspace startup、idle/active RAM、build peak、image pull、AI latency/cost。
9. 輸出go/no-go evidence同V0 pilot backlog；Mobile、RabbitMQ、OpenHands multi-agent、App Package Composer、Graphify、detached preview同DR留待對應stage。
10. 第一個business delivery target係5–10 user V0 pilot，而唔係一次過做完整50-user平台。

## Sources

[1] https://coder.com/docs
[2] https://coder.com/docs/user-guides/workspace-access/code-server
[3] https://coder.com/docs/admin/templates
[4] https://docs.openhands.dev/overview/introduction
[5] https://docs.litellm.ai/docs/proxy/virtual_keys
[6] https://langfuse.com/docs/observability/overview
[7] https://backstage.io/docs/features/software-templates
[8] https://kubernetes.io/docs/concepts/policy/resource-quotas
[9] https://keda.sh/docs/2.18/concepts
[10] https://eclipse.dev/che/docs/stable/discover/what-is-che
[11] https://ona.com/docs
[12] https://www.daytona.io/docs
[13] https://docs.litellm.ai/docs/proxy/multiple_admins
[14] https://docs.litellm.ai/docs/proxy/users
[15] https://docs.litellm.ai/docs/proxy/load_balancing
[16] https://kubernetes.io/docs/concepts/configuration/manage-resources-containers
[17] https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling
[18] https://docs.docker.com/engine/security
[19] https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs
[20] https://alembic.sqlalchemy.org/en/latest/tutorial.html
[21] https://docs.github.com/en/actions/concepts/security/openid-connect
[22] https://argo-cd.readthedocs.io/en/stable
[23] https://graphify.net
[24] https://docs.nestjs.com/techniques/performance
[25] https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop
[26] https://fastapi.tiangolo.com/deployment/server-workers
[27] https://docs.sonarsource.com/sonarqube-server/user-guide/code-metrics/metrics-definition
[28] https://docs.bullmq.io/guide/going-to-production
[29] https://www.rabbitmq.com/docs/quorum-queues
[30] https://www.rabbitmq.com/docs/confirms
[31] https://kafka.apache.org/documentation
[32] https://nodejs.org/api/worker_threads.html
[33] https://docs.python.org/3/library/threading.html
[34] https://kubernetes.io/docs/concepts/services-networking/network-policies
[35] https://kubernetes.io/docs/concepts/services-networking/service
[36] https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints
[37] https://www.postgresql.org/docs/current/warm-standby.html
[38] https://gateway-api.sigs.k8s.io
[39] https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/ag-overview
[40] https://developers.openai.com/codex/cloud
[41] https://developers.openai.com/codex/noninteractive
[42] https://developers.openai.com/codex/app-server
[45] https://openid.net/specs/openid-connect-core-1_0.html
[46] https://docs.k3s.io/datastore/ha-embedded
[47] https://docs.k3s.io/installation/requirements
[48] https://coder.com/docs/admin/templates/extending-templates/web-ides
