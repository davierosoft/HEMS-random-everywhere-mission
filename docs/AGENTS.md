# Documentation rules

- Document the current contract, ownership boundary, or test procedure; do not write conversational handoffs to a future model.
- Architecture belongs in `architecture/`, simulator checks in `testing/`, and workspace navigation in `WORKSPACE_MAP.md`.
- Avoid duplicating full changelog history. Link to the canonical document and keep one maintained procedure.
- Do not claim that static validators prove HPG/MSFS runtime behavior.
- Keep remaining-work lists limited to unfinished tasks. Preserve implemented contracts and runtime evidence separately; an unconnected helper is not an integrated feature. Record code-sync and validated-release status separately.
