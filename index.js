#!/usr/bin/env node
var shell = require('shelljs');
const chalk = require('chalk');
const Listr = require('listr');
var argv = require('minimist')(process.argv.slice(2));
var inquirer = require('inquirer');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
var pad = require('pad');
const opn = require('opn');
const gitUrlParse = require('git-url-parse');

if (!shell.exec(`git status`, {silent: true}).toString().includes('nothing to commit')) {
  console.error('working directory not clean. please commit changes');
  process.exit(1);
}

const log = shell.exec('git log -n 20 --pretty=format:"hash => %h date => %cr name => %cn message => %s"', {silent: true});

if (log.code !== 0) {
  console.error(`git returned code ${0} with output \n\n stdout ==> ${log.toString()} \n\n stderr ==> ${log.stderr}`);
  process.exit(log.code);
}

let allLocalBranches = shell.exec(`git branch`, {silent: true}).toString().split('\n');
const currentBranch = allLocalBranches.find((b) => b[0] === '*').slice(1).trim();
console.log('current branch', currentBranch);
const allBranches = allLocalBranches.filter((l) => l[0] !== '*').map((n) => n.trim());
allLocalBranches = allLocalBranches.map((b) => {
  if (b[0] === '*') {
    return b.slice(1).trim();
  } else {
    return b.trim();
  }
});

const allRemotes = Object.keys(shell.exec(`git remote`).toString().split('\n').filter(v => v.trim().length > 0).reduce((result, key) => {result[key.trim()] = key.trim(); return result}, {}));

const f = (value, length) => pad(value.slice(0, length), length);

const choices = log.toString()
  .split('\n')
  .map((line) => line.match(/hash => (.*) date => (.*) name => (.*) message => (.*)/))
  .map(([line, hash, date, author, message]) => ({hash, date, author, message, name: `${chalk.cyan(f(hash, 10))} ${chalk.green(f(author, 10))} ${chalk.yellow(f(date, 15))} ${chalk.white(f(message, 40))}\n`}))
  .map((o) => ({value: o, name: o.name}));

// console.log(options);
//
function wrap (f) {
  return function () {
    return new Promise((resolve, reject) => {
      try {
        f(resolve);
      } catch (e) {
        reject(e);
      }
    });
  };
}

function buildTasks (answers) {
  const tasks = [];

  tasks.push({
    title: `checkout branch ${answers.branchBase}`,
    task: wrap(function (cb) {
      shell.exec(`git checkout ${answers.branchBase}`, {silent: true}, (code, stdout, stderr) => {
        const updateEnv = {code, stdout, stderr};
        if (updateEnv.code !== 0) {
          console.error(`checking out branch ${answers.branchBase} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
          throw new Error('failed');
        }
        cb();
      });
    })
  });

  tasks.push({
    title: `pull on branch ${answers.branchBase}`,
    task: wrap(function (cb) {
      shell.exec(`git pull`, {silent: true}, (code, stdout, stderr) => {
        const updateEnv = {code, stdout, stderr};
        if (updateEnv.code !== 0) {
          console.error(`pulling branch ${answers.branchBase} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
          throw new Error('failed');
        }
        cb();
      });
    })
  });

  if (!answers.useExistingBranch) {
    tasks.push({
      title: `create branch ${answers.branchName}`,
      task: wrap(function (cb) {
        shell.exec(`git checkout -b ${answers.branchName}`, {silent: true}, (code, stdout, stderr) => {
          const updateEnv = {code, stdout, stderr};
          if (updateEnv.code !== 0) {
            console.error(`creating branch ${answers.branchName} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
            throw new Error('failed');
          }
          cb();
        });
      })
    });
  } else {
    answers.branchName = answers.branchBase; // normalize for future reference.
  }

  answers.commits.reverse().forEach((c) => {
    tasks.push({
      title: `cherry-pick commit [${c.name.slice(0, -2)}]`, // remove newline
      task: wrap(function (cb) {
        shell.exec(`git cherry-pick ${c.hash}`, {silent: true}, (code, stdout, stderr) => {
          const updateEnv = {code, stdout, stderr};
          if (updateEnv.code !== 0) {
            console.error(`cherry-pick for ${c.name} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
            throw new Error('failed');
          }
          cb();
        });
      })
    });
  });

  if (answers.isPushCommit) {
    tasks.push({
      title: `push commits to ${answers.remoteRepo}`,
      task: wrap(function (cb) {
        const command = answers.useExistingBranch ? `git push ${answers.remoteRepo}` : `git push -u ${answers.remoteRepo} ${answers.branchName}`;
        shell.exec(command, {silent: true}, (code, stdout, stderr) => {
          const updateEnv = {code, stdout, stderr};
          if (updateEnv.code !== 0) {
            console.error(`pushing changed to ${answers.origin}/${answers.branchName} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
            throw new Error('failed');
          }
          cb();
        });
      })
    });
  }

  if (answers.openWebsite) {
    tasks.push({
      title: `open website ${answers.openWebsiteUrl}`,
      task: () => opn(answers.openWebsiteUrl, {wait: false})
    });
  }

  return tasks;
}

inquirer.prompt([
  {
    type: 'checkbox',
    name: 'commits',
    pageSize: choices.length,
    message: 'please pick commits to patch: \n\n',
    choices
  },
  {
    type: 'confirm',
    name: 'useExistingBranch',
    when: (answers) => {
      if (argv._[0] && allBranches.indexOf(argv._[0]) >= 0){
        answers.useExistingBranch = false;
        return false;
      }
      return true;
    },
    message: 'Merge to existing branch?',
    default: false
  },
  {
    type: 'autocomplete',
    name: 'branchBase',
    when: (answers) => {
      if (argv._[0] && allBranches.indexOf(argv._[0]) >= 0) {
        answers.branchBase = argv._[0];
        return false;
      }
      return true;
    },
    message: ({useExistingBranch}) => useExistingBranch ? 'please pick branch: ' : 'please pick base for new branch: ',
    source: (answers, input) => Promise.resolve(allBranches.filter((b) => b.includes(input)).sort((a,b)=>a.length >= b.length))
  },
  {
    type: 'input',
    name: 'branchName',
    when: ({useExistingBranch}) => !useExistingBranch,
    message: `decide on name to new branch: `,
    default: ({branchBase}) => {
      let nameBase = currentBranch;
      if (nameBase.startsWith('patch/')) {
        [,,nameBase] = nameBase.match(/^(patch\/.*)-(.*\/.*)/);
      }
      nameBase = nameBase || currentBranch;// just in case we didn't make it..
      let newName = 'patch/' + branchBase.toUpperCase() + '-' + nameBase;
      let counter = 1;

      while (allLocalBranches.includes(newName)) {
        counter++;
        newName = `patch/${branchBase.toUpperCase()}-${counter}-${nameBase}`;
      }
      return newName;
    }
  },
  {
    type: 'confirm',
    name: 'isPushCommit',
    message: 'push commits to remote?',
    default: true
  },
  {
    type: 'autocomplete',
    name: 'remoteRepo',
    when: (answers) => {
      if (!answers.isPushCommit) {
        return false;
      }
      if (allRemotes.length === 1){
        answers.remoteRepo = allRemotes[0];
        return false;
      }
      return true;

    },
    message: 'select remote to push',
    default: () => allRemotes.length > 1 ? 'origin' : allRemotes[0],
    source: (answers, input) => Promise.resolve(allRemotes.filter((r) => r.includes(input)))
  }
  // {
  //   type: 'confirm',
  //   name: 'isOpenPr',
  //   when: ({isPushCommit}) => isPushCommit,
  //   message: () => {
  //     return 'open a PR from bitbucket.org?' // todo: understand origin url and construct
  //   },
  //   default: true
  // },

]).then(answers => {
  console.log(`\n\nThank you.. starting to work...\n\n`);
  const tasks = new Listr(buildTasks(answers));
  return tasks.run();
}).then(() => {
  console.log('finished.');
}).catch((e) => {
  console.error('process failed', e);
  process.exit(1);
});
