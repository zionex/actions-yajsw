import fs from 'fs-extra';
import fsPromise from 'fs/promises';
import * as path from 'path';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';

type FileNameDict = {[key: string]: string};
type FileReplaceInfo = {[key: string]: {[key: string]: string}};

(async (): Promise<void> => {
  try {
    const workingDir: string = process.cwd();
    const srcPath: string = path.join(workingDir, 'yajsw');

    const yajswUrl: string = 'https://github.com/zionex/actions-yajsw/releases/download/v2.1/yajsw.zip';

    console.log('Downloading yajsw...');
    console.log(`    URL: ${yajswUrl}`);

    const yajswFile: string = await tc.downloadTool(yajswUrl);
    const yajswDir: string = await tc.extractZip(
        yajswFile,
        srcPath
    );

    console.log(`The download path of yajsw: ${yajswDir}`);

    let distPath: string = core.getInput('dist-path');
    if (!distPath) {
      distPath = path.join(workingDir, 'release/yajsw');
    }

    console.log(`Copy yajsw from "${srcPath}" to "${distPath}"...`);

    fs.copySync(path.join(srcPath, 'bat'), path.join(distPath, 'bin'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'bin'), path.join(distPath, 'bin'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'conf', 'wrapper.conf.default'), path.join(distPath, 'wrapper', 'conf', 'wrapper.conf'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'lib'), path.join(distPath, 'wrapper', 'lib'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'scripts'), path.join(distPath, 'wrapper', 'scripts'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'templates'), path.join(distPath, 'wrapper', 'templates'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'wrapper.jar'), path.join(distPath, 'wrapper', 'wrapper.jar'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'wrapperApp.jar'), path.join(distPath, 'wrapper', 'wrapperApp.jar'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'wrapperApp9.jar'), path.join(distPath, 'wrapper', 'wrapperApp9.jar'), { overwrite: true });
    fs.copySync(path.join(srcPath, 'yajsw.policy.txt'), path.join(distPath, 'wrapper', 'yajsw.policy.txt'), { overwrite: true });

    console.log('Change the file name...');

    const renameFileDict: FileNameDict = {
      'installService.bat': 'install-service.bat',
      'installDaemon.sh': 'install-service.sh',
      'installDaemonNoPriv.sh': 'install-service-nopriv.sh',
      'runConsole.bat': 'run-console.bat',
      'runConsole.sh': 'run-console.sh',
      'startService.bat': 'start-service.bat',
      'startDaemon.sh': 'start-service.sh',
      'startDaemonNoPriv.sh': 'start-service-nopriv.sh',
      'stopService.bat': 'stop-service.bat',
      'stopDaemon.sh': 'stop-service.sh',
      'stopDaemonNoPriv.sh': 'stop-service-nopriv.sh',
      'uninstallService.bat': 'uninstall-service.bat',
      'uninstallDaemon.sh': 'uninstall-service.sh',
      'uninstallDaemonNoPriv.sh': 'uninstall-service-nopriv.sh',
      'wrapperW.bat': 'wrapperw.bat'
    };

    for (const key in renameFileDict) {
      fs.rename(path.join(distPath, 'bin', key), path.join(distPath, 'bin', renameFileDict[key]), () => {});
    }

    console.log('Delete unnecessary files...');

    const removeFilePaths: string[] = [
      'bin/demos',
      'bin/genConfig.bat',
      'bin/genConfig.sh',
      'bin/installDaemonD.sh',
      'bin/installDaemonNoPrivD.sh',
      'bin/keystore.bat',
      'bin/queryDaemon.sh',
      'bin/queryDaemonNoPriv.sh',
      'bin/queryService.bat',
      'bin/runConsoleW.bat',
      'bin/runHelloWorld.bat',
      'bin/runHelloWorld.sh',
      'bin/runServicesManagerClient.bat',
      'bin/runServicesManagerServer.bat',
      'bin/systemTrayIcon.bat',
      'bin/systemTrayIcon.sh',
      'bin/sytemTrayIconW.bat',
      'bin/uninstallDaemonD.sh'
    ];

    for (const removeFilePath of removeFilePaths) {
      const fullPath = path.join(distPath, removeFilePath);
      if (!fs.existsSync(fullPath)) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rm(fullPath, { recursive: true, force: true }, err => {
          if (err) {
            throw err
          }
        })
      } else {
        fs.unlinkSync(fullPath);
      }
    }

    console.log('Modify the contents of the file...');

    const fileReplaceInfo: FileReplaceInfo = {
      'bin/install-service.sh': {
        'installDaemonNoPriv.sh': 'install-service-nopriv.sh'
      },
      'bin/start-service.sh': {
        'startDaemonNoPriv.sh': 'start-service-nopriv.sh'
      },
      'bin/stop-service.sh': {
        'stopDaemonNoPriv.sh': 'stop-service-nopriv.sh'
      },
      'bin/uninstall-service.sh': {
        'uninstallDaemonNoPriv.sh': 'uninstall-service-nopriv.sh'
      },
      'bin/setenv.bat': {
        'set wrapper_home=%~dp0/..': 'set wrapper_home=%~dp0/../wrapper',
        'set wrapper_bat="%wrapper_home%/bat/wrapper.bat"': 'set wrapper_bat="%wrapper_home%/../bin/wrapper.bat"',
        'set wrapperw_bat="%wrapper_home%/bat/wrapperW.bat"': 'set wrapperw_bat="%wrapper_home%/../bin/wrapperW.bat"',
        'wrapperW.bat': 'wrapperw.bat'
      },
      'bin/setenv.sh': {
        'wrapper_home=.*': 'wrapper_home=$(pwd)/wrapper'
      },
      'wrapper/conf/wrapper.conf': {
        '#wrapper.java.command=java': 'wrapper.java.command=java',
        'wrapper.working.dir=': 'wrapper.working.dir=${wrapper_home}/..',
        'wrapper.logfile=.*': 'wrapper.logfile=${wrapper_home}/log/wrapper_YYYYMMDD_ROLLNUM.log',
        '#wrapper.logfile.rollmode=DATE': 'wrapper.logfile.rollmode=DATE\nwrapper.logfile.maxdays=7',
        '#wrapper.console.visible=false': 'wrapper.console.visible=true',
        'wrapper.tray = true': 'wrapper.tray = false',
        'wrapper.on_exit.0=SHUTDOWN': 'wrapper.on_exit.0=RESTART',
        'wrapper.on_signal.9=SHUTDOWN': 'wrapper.on_signal.9=RESTART',
        'wrapper.filter.trigger.0=Exception': '#wrapper.filter.trigger.0=Exception',
        'wrapper.filter.script.0=.*': '#wrapper.filter.script.0=${wrapper_home}/scripts/trayMessage.gv',
        'wrapper.filter.script.0.args=Exception': '#wrapper.filter.script.0.args=Exception'
      }
    }

    for (const file in fileReplaceInfo) {
      const replaceInfo = fileReplaceInfo[file];
      for (const fromText in replaceInfo) {
        const toText = replaceInfo[fromText];

        const orgData: string = await fsPromise.readFile(path.join(distPath, file), 'utf-8');
        const newData: string = orgData.replace(new RegExp(fromText, "g"), toText);

        await fsPromise.writeFile(path.join(distPath, file), newData);
      }
    }

    console.log('Modify the yajsw config file...');

    let serviceName: string = core.getInput('service-name');
    if (!serviceName) {
      serviceName = 'yajsw-service';
    }

    let mainClass: string = core.getInput('java-app-main-class');
    let jarFile: string = core.getInput('java-app-jar-file');
    let vmOptions: string = core.getInput('java-vm-options');

    let maxMemory: string = core.getInput('java-max-memory');
    if (!maxMemory) {
      maxMemory = '8192';
    }

    const orgData: string = await fsPromise.readFile(path.join(distPath, 'wrapper/conf/wrapper.conf'), 'utf-8');

    let newData: string;
    newData = orgData.replace(/wrapper.console.title=yajsw/g, 'wrapper.console.title=' + serviceName);
    newData = newData.replace(/wrapper.ntservice.name=yajsw/g, 'wrapper.ntservice.name=' + serviceName);
    newData = newData.replace(/wrapper.ntservice.displayname=yajsw/g, 'wrapper.ntservice.displayname=' + serviceName);
    newData = newData.replace(/wrapper.ntservice.description=yajsw/g, 'wrapper.ntservice.description=' + serviceName);
    newData = newData.replace(/#wrapper.java.maxmemory=64/g, 'wrapper.java.maxmemory=' + maxMemory);

    if (mainClass) {
      newData = newData.replace(/wrapper.java.app.mainclass=/g, 'wrapper.java.app.mainclass=' + mainClass);
      newData = newData.replace(/#wrapper.java.classpath.1=/g, 'wrapper.java.classpath.1=${wrapper_home}/../lib/*.jar');
      newData = newData.replace(/# wrapper.java.library.path.1=..\/lib/g, 'wrapper.java.library.path.1=${wrapper_home}/../lib');
    } else if (jarFile) {
      newData = newData.replace(/wrapper.java.app.mainclass=/g, '#wrapper.java.app.mainclass=');
      newData = newData.replace(/#wrapper.java.app.jar=/g, 'wrapper.java.app.jar=${wrapper_home}/../' + jarFile);
    }

    if (vmOptions) {
      const params: string[] = [];

      vmOptions.split(' ').forEach((item: string, index: number): void => {
        params.push(`wrapper.java.additional.${index}=${item}`);
      });

      newData = newData.replace(/#wrapper.java.additional.1=/g, params.join('\n'));
    }

    await fsPromise.writeFile(path.join(distPath, 'wrapper/conf/wrapper.conf'), newData);
  } catch (err: any) {
    core.setFailed(err.message);
  }
})();
