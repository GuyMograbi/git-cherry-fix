# git-cherry-fix

> helps you get your fixes to another branch by cherry-picking them

# Installation

```
npm install -g git-cherry-fix
```

# Usage

start interactive process

```
git-cherry-fix
```

quick interactive process

```
git-cherry-fix <base-branch>
```

# Assumptions

In order for the `quick-pr` tool to work best, you should name your branches with a prefix and a forward slash.

So for example `task/this-is-my-branch`.

quick-pr uses this to know where your branch name starts, and uses the same convention by prefixing patch branches with `patch/TARGET-task/this-is-my-branch`. Where target is the target branch.

# Examples

I just wrote a hotfix to master. Now I want to port it to staging and develop.

 - I use branch name `patch/MASTER-task/fix-something`
 - I run the command `git-cherry-fix staging`
   - This will automatically create branch `patch/STAGING-task/fix-something` based off staging
 - I run the command `git-cherry-fix develop`
   - This will automatically create branch `task/fix-something` based off develop

# Configuration

The following configuration is available in a file called `.git-cherry-fix.yml`.    
We will look for the file upwards.


```
main_branch: develop
branch_nickname:
  master: production
  staging: qa
```

* **main_branch** - defaults to `develop`. will remove the prefix from the target branch if main_branch. for example, cherry picking from `patch/branch-fix/something` to `develop` will automatically make the branch name simply `fix/something` (without a prefix).
* **branch_nickname** - will use the nickname on the target branch name prefix. for example `patch/production-fix/something`.



roadmap:

 - [X] push changes
 - [X] ~~open a PR (support bitbucket) - when applicable using base branch~~ - Use [quick-pr](http://github.com/GuyMograbi/quick-pr) instead
 - [X] allow configuration for different standards used than default
 - [ ] show only commits that do not exist in target branch
