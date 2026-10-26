terraform {
  required_version = ">= 1.14"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.10"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

locals {
  workload = "corpsinsights"
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.workload}-${var.environment}"
  location = var.location
}

resource "azurerm_storage_account" "data" {
  name                     = "st${local.workload}${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"

  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
}

resource "azurerm_storage_share" "data" {
  name               = "data"
  storage_account_id = azurerm_storage_account.data.id
  quota              = 1
}

resource "azurerm_container_app_environment" "main" {
  name                = "cae-${local.workload}-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_container_app_environment_storage" "data" {
  name                         = azurerm_storage_share.data.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  account_name                 = azurerm_storage_account.data.name
  share_name                   = azurerm_storage_share.data.name
  access_key                   = azurerm_storage_account.data.primary_access_key
  access_mode                  = "ReadOnly"
}

resource "azurerm_container_app" "main" {
  name                         = "ca-${local.workload}-${var.environment}"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = local.workload
      image  = "ghcr.io/slazengerv100/corps-visualisation-tool:${var.image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "DATA_FOLDER"
        value = "/data"
      }

      volume_mounts {
        name = "data"
        path = "/data"
      }
    }

    volume {
      name         = "data"
      storage_name = azurerm_container_app_environment_storage.data.name
      storage_type = "AzureFile"
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }

    dynamic "ip_security_restriction" {
      for_each = var.allowed_ip_ranges

      content {
        name             = ip_security_restriction.key
        action           = "Allow"
        ip_address_range = ip_security_restriction.value
      }
    }
  }
}
