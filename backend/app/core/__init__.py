"""
Core package.

Houses cross-cutting concerns that the rest of the application depends on:
configuration (settings), logging setup, and application-wide exceptions.
Nothing in this package should depend on domain models or API routes -
dependencies should only ever point "inward" (core has no outward deps).
"""
