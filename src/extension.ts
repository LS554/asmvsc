// Copyright (c) 2025 London Sheard
// Licensed under the MIT License. See LICENSE file in the project root for details.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    return;
  }

  const folderPath = workspaceFolders[0].uri.fsPath;
  const vscodeDir = path.join(folderPath, '.vscode');
  const tasksPath = path.join(vscodeDir, 'tasks.json');

  if (!fs.existsSync(tasksPath)) {
    const asmFiles = await vscode.workspace.findFiles('**/*.asm', '**/node_modules/**', 1);
    if (asmFiles.length > 0) {
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
      }

      const defaultTasks = {
        version: "2.0.0",
        tasks: [
          {
            label: "build and link",
            type: "shell",
            command: "nasm -felf64 -o ${fileBasenameNoExtension}.o ${file} && ld -o ${fileBasenameNoExtension} ${fileBasenameNoExtension}.o",
            group: {
              kind: "build",
              isDefault: true
            }
          },
          {
            label: "build",
            type: "shell",
            command: "nasm -felf64 -o ${fileBasenameNoExtension}.o ${file}",
            group: {
              kind: "build",
              isDefault: false
            }
          },
          {
            label: "link",
            type: "shell",
            command: "ld -o ${fileBasenameNoExtension} ${fileBasenameNoExtension}.o",
            dependsOn: "build",
            group: {
              kind: "build",
              isDefault: false
            }
          }
        ]
      };

      fs.writeFileSync(tasksPath, JSON.stringify(defaultTasks, null, 2), 'utf8');
      vscode.window.showInformationMessage('Default tasks.json for .asm files created.');
    }
  }

  // Register command to run the "build and link" task
  const runBuildAndLinkCmd = vscode.commands.registerCommand('asmvsc.runBuildAndLink', async () => {
    const tasks = await vscode.tasks.fetchTasks();
    const task = tasks.find(t => t.name === 'build and link');
    if (task) {
      vscode.tasks.executeTask(task);
    } else {
      vscode.window.showErrorMessage('Build and link task not found.');
    }
  });
  context.subscriptions.push(runBuildAndLinkCmd);

  // Register command to run the "build" task
  const runBuildOnlyCmd = vscode.commands.registerCommand('asmvsc.runBuildOnly', async () => {
    const tasks = await vscode.tasks.fetchTasks();
    const task = tasks.find(t => t.name === 'build');
    if (task) {
      vscode.tasks.executeTask(task);
    } else {
      vscode.window.showErrorMessage('Build task not found.');
    }
  });
  context.subscriptions.push(runBuildOnlyCmd);

  // Register command to choose between build options
  const chooseBuildOptionCmd = vscode.commands.registerCommand('asmvsc.chooseBuildOption', async () => {
    const selected = await vscode.window.showQuickPick(['build', 'build and link'], {
      placeHolder: 'Select a build option'
    });

    if (selected === 'build') {
      vscode.commands.executeCommand('asmvsc.runBuildOnly');
    } else if (selected === 'build and link') {
      vscode.commands.executeCommand('asmvsc.runBuildAndLink');
    }
  });
  context.subscriptions.push(chooseBuildOptionCmd);

  // Create and show a status bar button to choose the build option
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = '$(gear) Build ASM';
  statusBarItem.tooltip = 'Choose a build option';
  statusBarItem.command = 'asmvsc.chooseBuildOption';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
