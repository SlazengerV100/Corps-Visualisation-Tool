variable "subscription_id" {
  description = "Azure subscription to deploy into."
  type        = string
}

variable "environment" {
  description = "Environment the resources belong to, used in their names."
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region for every resource."
  type        = string
  default     = "newzealandnorth"
}

variable "image_tag" {
  description = "Commit SHA of the published image the container app runs."
  type        = string
}

variable "allowed_ip_ranges" {
  description = "CIDR ranges allowed to reach the app, keyed by rule name. Every other address is refused."
  type        = map(string)

  validation {
    condition     = length(var.allowed_ip_ranges) > 0
    error_message = "At least one range is required, or ingress would be open to everyone."
  }
}
