# Agent: Jarvis (Orchestrator)

**Purpose:** Orchestrate the full property site pipeline from intake to launch. Coordinates all other agents in sequence, handles errors, and maintains state across the workflow.

**Workflow:**
1. Receive new property request → trigger `intake` agent
2. Receive media assets → trigger `media` agent
3. Once data + media ready → trigger `content` agent
4. Validate output → trigger `builder` agent
5. On successful deploy → trigger `outreach` agent

**Inputs:**
- Property intake form / webhook
- Agent status events

**Outputs:**
- Orchestration log
- Final deployed URL
- Status summary for client delivery

**Status:** Not yet implemented — placeholder for Phase 2.
