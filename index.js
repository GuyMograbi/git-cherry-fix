#!/usr/bin/env node
var shell = require('shelljs');
const chalk = require('chalk');
const Listr = require('listr');
var inquirer = require('inquirer');
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
var pad = require('pad');

if (!shell.exec(`git status`, {silent: true}).toString().includes('nothing to commit')){
  console.error('working directory not clean. please commit changes');
  process.exit(1);
};

const log = shell.exec('git log -n 20 --pretty=format:"hash => %h date => %cr name => %cn message => %s"', {silent: true});

if (log.code !== 0) {
  console.error(`git returned code ${0} with output \n\n stdout ==> ${log.toString()} \n\n stderr ==> ${log.stderr}`);
  process.exit(log.code);
}

const allLocalBranches = shell.exec(`git branch`, {silent: true}).toString().split('\n');
const currentBranch = allLocalBranches.find((b)=>b[0] === '*').slice(1).trim();
console.log('current branch', currentBranch);
const allBranches =  allLocalBranches.filter((l)=>l[0] !== '*').map((n)=>n.trim());


const f = (value, length) => pad(value.slice(0,length), length)

const choices = log.toString()
  .split('\n')
  .map((line) => line.match(/hash => (.*) date => (.*) name => (.*) message => (.*)/))
  .map(([line, hash, date, name, message]) => ({hash, date, name, message, name: `${chalk.cyan(f(hash,20))} ${chalk.green(f(name,20))} ${chalk.yellow(f(date,20))} ${chalk.white(f(message, 50))}\n`}))
  .map((o) => ({value:o, name:o.name}));

// console.log(options);

function buildTasks(answers) {
  const tasks = [];

  tasks.push({
    title: `checkout branch ${answers.branchBase}`,
    task: function(){
      const updateEnv = shell.exec(`git checkout ${answers.branchBase}`, {silent: true});
      if (updateEnv.code !== 0){
        console.error(`checking out branch ${answers.branchBase} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
        throw new Error('failed')
      }
    }
  })

  tasks.push({
    title: `pull on branch ${answers.branchBase}`,
    task: function(){
      const updateEnv = shell.exec(`git pull`, {silent: true});
      if (updateEnv.code !== 0){
        console.error(`pulling branch ${answers.branchBase} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
        throw new Error('failed')
      }
    }
  });

  if (!answers.useExistingBranch){
    tasks.push({
      title: `create branch ${answers.branchName}`,
      task: function(){
        const updateEnv = shell.exec(`git checkout -b ${answers.branchName}`, {silent: true});
        if (updateEnv.code !== 0){
          console.error(`creating branch ${answers.branchName} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
          throw new Error('failed')
        }
      }
    })
  }

  answers.commits.reverse().forEach((c)=>{
    tasks.push({
      title: `cherry-pick commit [${c.name}]`,
      task: function(){
        const updateEnv = shell.exec(`git cherry-pick ${c.hash}`, {silent: true});
        if (updateEnv.code !== 0){
          console.error(`cherry-pick for ${c.name} failed with code ${updateEnv.code}. \n ${updateEnv.toString()} \n ${updateEnv.stderr}`);
          throw new Error('failed')
        }
      }
    })
  })

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
    message: 'Merge to existing branch?',
    default: false
  },
  {
    type: 'autocomplete',
    name: 'branchBase',
    message: ({useExistingBranch}) => useExistingBranch ? 'please pick branch: ' : 'please pick base for new branch: ',
    source: (answers, input)=> Promise.resolve(allBranches.filter((b)=>b.includes(input)))
  },
  {
    type: 'input',
    name: 'branchName',
    when: ({useExistingBranch}) => !useExistingBranch,
    message: `decide on name to new branch: `,
    default: ({branchBase}) => {
      let newName = branchBase.toUpperCase() + '-' + currentBranch;
      let counter = 1;
      while (allLocalBranches.includes(newName)){
        counter++;
        newName = `${branchBase.toUpperCase()}-${counter}-${currentBranch}`;
      }
      return newName;
    }
  }
]).then(answers => {
  const tasks = new Listr(buildTasks(answers));
  return tasks.run()
}).then(()=>{
  console.log('finished.')
}).catch((e)=>{
  console.error('process failed',e);
  process.exit(1);
})
