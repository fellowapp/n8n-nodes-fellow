![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-starter

This repo contains example nodes to help you get started building your own custom integrations for [n8n](n8n.io). It includes the node linter and other dependencies.

To make your custom node available to the community, you must create it as an npm package, and [submit it to the npm registry](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry).

## Prerequisites

You need the following installed on your development machine:

* [git](https://git-scm.com/downloads)
* Node.js and pnpm. Minimum version Node 18. You can find instructions on how to install both using nvm (Node Version Manager) for Linux, Mac, and WSL [here](https://github.com/nvm-sh/nvm). For Windows users, refer to Microsoft's guide to [Install NodeJS on Windows](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
* Install n8n with:
  ```
  pnpm install n8n -g
  ```
* Recommended: follow n8n's guide to [set up your development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/).

## Using this starter

These are the basic steps for working with the starter. For detailed guidance on creating and publishing nodes, refer to the [documentation](https://docs.n8n.io/integrations/creating-nodes/).

1. [Generate a new repository](https://github.com/n8n-io/n8n-nodes-starter/generate) from this template repository.
2. Clone your new repo:
   ```
   git clone https://github.com/<your organization>/<your-repo-name>.git
   ```
3. Run `pnpm i` to install dependencies.
4. Open the project in your editor.
5. Browse the examples in `/nodes` and `/credentials`. Modify the examples, or replace them with your own nodes.
6. Update the `package.json` to match your details.
7. Run `pnpm lint` to check for errors or `pnpm lintfix` to automatically fix errors when possible.
8. Test your node locally. Refer to [Run your node locally](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/) for guidance.
9. Replace this README with documentation for your node. Use the [README_TEMPLATE](README_TEMPLATE.md) to get started.
10. Update the LICENSE file to use your details.
11. [Publish](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry) your package to npm.

## GitHub Actions

This repository includes automated workflows for publishing and deployment:

### Staging Workflow (publish-staging.yml)
On push to `main`, automatically:
- Builds the package with staging configuration
- Publishes to: `@fellowapp/n8n-nodes-fellow-staging`
- Version format: `{version}-staging.{short-sha}` (e.g., `0.1.0-staging.abc123`)

### Production Workflow (publish-prod.yml)
On GitHub release creation, automatically:
- Builds the package with production configuration
- Publishes to: `@fellowapp/n8n-nodes-fellow`
- Version: Uses the release tag (e.g., `v0.1.0` → `0.1.0`)

**To create a production release:**
1. Go to GitHub → Releases → "Draft a new release"
2. Create a new tag following semver (e.g., `v0.1.0`, `v0.2.0`, `v1.0.0`)
3. Publish the release
4. The workflow will automatically build and publish the production package

### Auto-Update ops-workflow-builder
The `update-ops-workflow-builder.yml` workflow automatically creates a PR to update the n8n node staging version in the `fellowapp/ops-workflow-builder` repository after a successful staging publish.

**Required Secret:**
- `OPS_WORKFLOW_BUILDER_PAT`: A GitHub Personal Access Token with the following permissions:
  - `repo` scope (full control of private repositories)
  - Access to the `fellowapp/ops-workflow-builder` repository

To create this token:
1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate a new token with `repo` scope
3. Add it as a repository secret named `OPS_WORKFLOW_BUILDER_PAT` in this repository's settings

## More information

Refer to our [documentation on creating nodes](https://docs.n8n.io/integrations/creating-nodes/) for detailed information on building your own nodes.

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)
