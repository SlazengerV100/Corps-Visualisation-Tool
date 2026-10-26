# Infrastructure

Terraform for the Azure resources that host Corps Analytics. Everything lives in one resource group in New Zealand North.

| Resource | Purpose |
| ------ | ------ |
| Resource group `rg-corpsinsights-<environment>` | Holds every resource below. |
| Storage account and `data` Azure Files share | Holds the CSV exports. The app reads them as plain files. |
| Container Apps environment `cae-corpsinsights-<environment>` | Hosts the app. It has no Log Analytics workspace, so logs are streamed only. |
| Container app `ca-corpsinsights-<environment>` | Runs the published image with the `data` share mounted read-only at `/data`. It scales to zero when idle and starts on the first request. |

The container app only accepts requests from the IP ranges in `allowed_ip_ranges`.

## Prerequisites

| Pre-requisite | Version |
| ------ | ------ |
| Terraform | ^1.14 |
| Azure CLI | any |

Sign in with `az login` before running Terraform.

## Setup

1. Make a copy of [`example.tfvars`](example.tfvars) named `terraform.tfvars` in this folder.
1. Complete the fields with the following description:

    | Variable | Description |
    | ------ | ------ |
    | subscription_id | The Azure subscription to deploy into. |
    | environment | Optional. Used in resource names. Defaults to `dev`. |
    | location | Optional. Defaults to `newzealandnorth`. |
    | image_tag | The full commit SHA of the image to run, from `ghcr.io/slazengerv100/corps-visualisation-tool`. |
    | allowed_ip_ranges | CIDR ranges allowed to reach the app, keyed by a name for each rule, for example `{ home = "203.0.113.4/32" }`. At least one is required. |

1. Run `terraform init`.

`terraform.tfvars` and the state files are gitignored. State is kept locally and contains the storage account keys, so never commit it. The repository is public.

## Deploying

Always deploy from the `main` checkout (not a branch), making sure that the latest changes have been pulled.

1. Run `terraform plan -out=tfplan` and review the plan. Look out for any resource it would replace or destroy.
1. Run `terraform apply tfplan`.
1. Run `terraform output app_url` for the app's address.

To deploy a different image, set `image_tag` to that commit's SHA and deploy again. To roll back, use the SHA of an earlier working commit.

If your IP address changes, update `allowed_ip_ranges` and deploy again.

## Data

Upload the CSV exports to the root of the `data` share, for example:

```sh
az storage file upload-batch --account-name stcorpsinsightsdev --destination data --source <path to data folder>
```

The app reads the data once at start-up and refuses to start if a file is missing. After changing the data, restart the app so it reads the new files:

```sh
az containerapp revision restart --name ca-corpsinsights-dev --resource-group rg-corpsinsights-dev --revision <revision name>
```

## Logs

Logs are not stored anywhere, to avoid the cost of a Log Analytics workspace. You can only stream them live, which is free, and anything printed while you're not streaming is lost:

```sh
az containerapp logs show --name ca-corpsinsights-dev --resource-group rg-corpsinsights-dev --follow
```

Add `--type system` to see platform events, such as image pulls and failed starts.
