# Example: Project Health Command Design

Use a small Python entry point that calls existing canonical commands without reimplementing validation logic. Fail fast, preserve subprocess output, and keep behavior portable to Python 3.11+. The command itself does not call application or external-service APIs. Environment preparation through locked `uv` dependencies may create `.venv/`, populate a package cache, and download missing packages before the command runs. This is an artifact example; no command is implemented in this repository.
