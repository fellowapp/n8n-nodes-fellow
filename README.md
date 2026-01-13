# n8n-nodes-fellow

This is an n8n community node that lets you integrate [Fellow](https://fellow.ai) into your n8n workflows.

Fellow is the top-rated AI meeting assistant that records, transcribes, and summarizes meetings. This node allows you to automate workflows triggered by meeting events and interact with Fellow's meeting notes and action items.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Credentials

To use this node, you need a Fellow API key:

1. Log in to [Fellow](https://fellow.ai)
2. Navigate to your user settings
3. Generate an API key from the API, MCP & Webhooks section
4. Use your workspace subdomain and API key to configure the credentials in n8n

## Operations

### Fellow Node

**Action Items**
- **Get**: Retrieve an action item by ID
- **Get Many**: List action items with optional filters (scope, completed, archived, AI-detected)
- **Complete**: Mark an action item as complete

**Notes**
- **Get**: Retrieve an AI-generated meeting note by ID
- **Get Many**: List notes with optional filters (title, event, channel, date ranges, attendees)

### Fellow Trigger

Trigger workflows when Fellow events occur:

- **AI Note Generated**: Triggers when an AI note is generated after a meeting
- **AI Note Shared to Channel**: Triggers when an AI note is shared to a Fellow channel
- **Action Item Assigned To Me**: Triggers when an action item is assigned to you
- **Action Item Completed**: Triggers when an action item is marked as complete

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Fellow](https://fellow.ai)
- [Fellow Help Center](https://help.fellow.ai)

## License

[MIT](LICENSE.md)
