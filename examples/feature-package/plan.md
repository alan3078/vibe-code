# Project Health Command Implementation Plan

## Goal

Provide one local entry point that reports repository health using existing canonical checks.

## Architecture

A small command wrapper invokes the structural validator, then the full test suite, failing immediately on the first non-zero result.

## Ordered tasks

1. Add a subprocess test proving the missing command fails for the intended reason.
2. Add the smallest wrapper that invokes the existing validator and test commands.
3. Verify failure propagation with a controlled failing dependency.
4. Run focused tests, validator, and full suite against one frozen revision.

Each implementation task must record exact files, RED evidence, minimal GREEN change, verification evidence, risks, and commit boundary.
