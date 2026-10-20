output "storage_account_name" {
  description = "Storage account holding the CSV data share."
  value       = azurerm_storage_account.data.name
}

output "data_share_name" {
  description = "Azure Files share the backend reads its CSV exports from."
  value       = azurerm_storage_share.data.name
}
