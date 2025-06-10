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
  const runBuildTaskCmd = vscode.commands.registerCommand('asmvsc.runBuildTask', async () => {
    const tasks = await vscode.tasks.fetchTasks();
    const buildTask = tasks.find(task => task.name === 'build and link');
    if (buildTask) {
      vscode.tasks.executeTask(buildTask);
    } else {
      vscode.window.showErrorMessage('Build task not found');
    }
  });
  context.subscriptions.push(runBuildTaskCmd);

  // Create and show a status bar button to run the build task
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = '$(gear) Build ASM';
  statusBarItem.tooltip = 'Run build and link task';
  statusBarItem.command = 'asmvsc.runBuildTask';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
