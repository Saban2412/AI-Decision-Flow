# AI Decision Flow

AI Decision Flow is a visual workflow builder for creating and executing
AI-powered decision trees. Users can create decision nodes, connect `YES` and
`NO` branches, provide an input message, and run the workflow asynchronously
through Inngest.

The application is built with Next.js, React Flow, Inngest, and an
OpenAI-compatible LLM client configured for OpenRouter.

## Features

- Visual workflow editor powered by React Flow
- Editable AI decision nodes
- `YES` and `NO` source handles for branching
- Dynamic node creation and edge connections
- Durable, asynchronous workflow execution with Inngest
- OpenRouter-compatible LLM integration
- Execution status polling
- Execution log panel showing each visited node and its decision
- Cycle detection to prevent infinitely looping workflows
- Optional mock LLM responses for local debugging

## Architecture

The workflow execution path is:

1. The browser sends the current nodes, edges, and input message to
   `/api/workflow/run`.
2. The API route publishes a `workflow/execute.requested` event to Inngest.
3. Inngest invokes `execute-ai-workflow`.
4. Each decision node asks the configured LLM for either `YES` or `NO`.
5. The selected edge determines the next node.
6. The browser polls `/api/workflow/status` and displays the execution path.

Relevant files:

```text
src/app/page.js                         Visual workflow editor
src/components/DecisionNode.jsx        Decision node UI
src/app/api/workflow/run/route.js       Starts a workflow execution
src/app/api/workflow/status/route.js    Reads execution status and logs
src/app/api/inngest/route.js            Inngest function registration endpoint
src/lib/inngest/functions.js            Workflow execution function
src/lib/inngest/client.js               Inngest client
src/lib/llm/client.js                   OpenRouter/OpenAI-compatible client
```

## Requirements

- Node.js 20 or newer
- npm
- An OpenRouter API key, unless using the local mock mode
- Inngest CLI for local workflow execution

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Saban2412/AI-Decision-Flow.git
cd AI-Decision-Flow
npm install
```

Create a `.env.local` file in the project root:

```env
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your_openrouter_api_key
LLM_MODEL=google/gemini-2.0-flash-exp:free

INNGEST_EVENT_KEY=local_development
INNGEST_SIGNING_KEY=local_development
INNGEST_DEV=1
```

Never commit `.env.local` or expose an API key in source control. The repository
ignores environment files by default.

## Running locally

Start the Next.js development server:

```bash
npm run dev
```

In a second terminal, start the Inngest development server and point it to the
application endpoint:

```bash
npx inngest-cli@latest dev -u http://127.0.0.1:3000/api/inngest
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The Inngest
dashboard is available at [http://localhost:8288](http://localhost:8288).

Start the servers in this order and wait for Inngest to register the
application before submitting a workflow. The Inngest terminal should report
that the application has been synced.

## Using the workflow builder

1. Edit the criteria in the existing decision nodes.
2. Click **Add Node** to create additional decision nodes.
3. Connect node handles to define the workflow branches:
   - `YES` selects an edge with `sourceHandle: "YES"`.
   - `NO` selects an edge with `sourceHandle: "NO"`.
4. Enter an input message in the header field.
5. Click **Run Workflow**.
6. Follow the execution status and decisions in the **Execution Logs Panel**.

If a node has no outgoing edge for the returned decision, the workflow ends at
that node.

## Local mock mode

To test the complete workflow without making an LLM request, temporarily add
one of these values to `.env.local`:

```env
LLM_MOCK_RESPONSE=YES
```

or:

```env
LLM_MOCK_RESPONSE=NO
```

Restart both Next.js and Inngest after changing environment variables. Mock
mode returns the selected decision for every node and is useful for verifying
the editor, Inngest integration, branching, and execution logs independently
of OpenRouter.

Remove `LLM_MOCK_RESPONSE` when testing the real model.

## Error handling

- Missing or invalid LLM credentials cause the workflow to fail explicitly.
- LLM requests have a 30-second timeout.
- Failed status requests are shown in the UI instead of being reported as
  indefinitely running.
- Cyclic workflows are rejected when a node is visited more than once.
- The local status endpoint reports when the Inngest development server is not
  available.

## Scripts

```bash
npm run dev      # Start the Next.js development server
npm run build    # Create a production build
npm run start    # Start the production server
npm run lint     # Run ESLint
```

## Production considerations

For production deployment:

- Use production Inngest credentials and signing keys.
- Store LLM credentials in the deployment platform's secret manager.
- Replace the local Inngest URL used by the status route with an appropriate
  production API or service endpoint.
- Configure the LLM model and OpenRouter limits for the expected workload.
- Review authentication and authorization before exposing workflow execution to
  untrusted users.

## License

This project does not currently declare a license.
