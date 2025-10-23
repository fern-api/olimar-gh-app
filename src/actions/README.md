## Actions

### Summary
An action is loosely defined as any atomic operation we want to perform on a customer config repo. These should be invoked from 

### Schema
All actions should extend the same standardized action schema
```ts
/**
 * Base parameters for all GitHub actions
 */
export interface BaseActionParams {
  octokit: any; // Typed as any to match webhook handler signature from octokit package
  owner: string;
  repo: string;
}
```