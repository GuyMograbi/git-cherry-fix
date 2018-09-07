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



roadmap:

 - [X] push changes
 - [X] ~~open a PR (support bitbucket) - when applicable using base branch~~ - Use [quick-pr](http://github.com/GuyMograbi/quick-pr) instead
 - [ ] show only commits that do not exist in target branch
