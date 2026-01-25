---
description: Add unit tests for new features or refactored code using Vitest and React Testing Library
---

Follow these steps to ensure code quality and prevent regressions:

1. **Identify the Scope**
   - Review the code changes (new components, modified logic, bug fixes).
   - Identify the primary files that require testing coverage.

2. **Determine Test Location**
   - For **Unit Tests**: Co-locate the test file with the source file.
     - Example: If testing `app/components/MyComponent.tsx`, create `app/components/MyComponent.test.tsx`.
   - For **Server Logic Tests** (PartyKit):
     - Located in `test/server/` or co-located in `party/`.
     - Import standard mocks from `test/mocks/party.ts`.
     - Example:

       ```ts
       import { describe, it, expect, beforeEach } from "vitest"
       import Server from "../../party/server"
       import {
         MockRoom,
         MockConnection,
         createMockConnectionContext,
       } from "../mocks/party"

       describe("Server Logic", () => {
         let room: MockRoom
         let server: Server

         beforeEach(() => {
           room = new MockRoom("test-room")
           server = new Server(room as any)
         })

         it("should handle connection", async () => {
           const conn = new MockConnection("user1")
           await server.onConnect(conn as any, createMockConnectionContext())
           expect(server.players.has("user1")).toBe(true)
         })
       })
       ```

   - For **Integration/E2E-lite Tests**: Place them in the `test/` directory.

3. **Scaffold the Test File**
   - Create the file if it doesn't exist.
   - Import necessary testing utilities:
     ```tsx
     import { describe, it, expect } from "vitest"
     // for client
     import { render, screen, fireEvent } from "@testing-library/react"
     // for server
     import { MockRoom, MockConnection } from "../mocks/party"
     ```

4. **Write Comprehensive Tests**
   - **Rendering**: Verify that the component renders correctly with default props.
   - **Interactions**: Simualte user actions (clicks, typing) using `fireEvent` or `userEvent` (if available) and assert expected outcomes.
   - **Edge Cases**: Test empty states, error states, and boundary conditions.
   - **Logic**: For pure functions, test various inputs and expected outputs.

5. **Run Tests**
   - Run the tests to verify correctness:
     ```bash
     pnpm test
     ```
   - To run a specific test file:
     ```bash
     pnpm test <filename>
     ```

6. **Refine and Fix**
   - If tests fail, analyze the failure.
     - Is the test wrong? Update the test.
     - Is the code wrong? Fix the bug in the source code.
   - Ensure all tests pass before considering the task complete.
