# Infra

## Region

- The app reads its data as plain files from the mounted Azure Files share. Don't add storage SDKs, connection strings or keys to the app.
- Resources should go into the New Zealand North region where possible.

## Applying changes

- Only apply from an up-to-date main checkout, after the change has merged. Never `terraform apply` from a branch or worktree; plan there only.
- Show the user a saved `terraform plan -out=tfplan` before every apply, and apply only that plan. Never `-auto-approve`.
- Never run `terraform destroy`, or apply a plan that destroys or replaces a resource, unless the user asked for it. Call out any replacement in the plan.
- Run `terraform fmt` and `terraform validate` before committing.

## Secrets and state

- State is local to the maintainer's machine and holds the storage account keys. Never force-add a gitignored file.
- The repository is public, so be aware of this whenever handling secrets.

## Cost

- Use Azure free-forever products where possible.
- Flag anything that adds cost before adding it.
- Pay-as-you-go is not enabled yet.
- A number of resources are free under the 12 month Azure free trial, so check its status first.
