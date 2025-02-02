import { BrowserWindow, dialog } from 'electron'
import { Game, Runner } from './games'
import { logInfo, LogPrefix } from './logger/logger'
import i18next from 'i18next'

export async function handleProtocol(window: BrowserWindow, url: string) {
  const mainWindow = BrowserWindow.getAllWindows()[0]
  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  let [command, arg] = path.split('/')
  if (!command || !arg) {
    command = path
    arg = null
  }
  logInfo(`received '${url}'`, LogPrefix.ProtocolHandler)
  if (command === 'ping') {
    return logInfo(['Received ping! Arg:', arg], LogPrefix.ProtocolHandler)
  }
  if (command === 'launch') {
    let runner: Runner = 'legendary'
    let game = await Game.get(arg, runner).getGameInfo()
    if (!game) {
      runner = 'gog'
      game = await Game.get(arg, runner).getGameInfo()
    }
    const { is_installed, title, app_name } = game
    setTimeout(async () => {
      // wait for the frontend to be ready
      if (!is_installed) {
        logInfo(`"${arg}" not installed.`, LogPrefix.ProtocolHandler)
        const { response } = await dialog.showMessageBox({
          buttons: [i18next.t('box.yes'), i18next.t('box.no')],
          cancelId: 1,
          message: `${title} ${i18next.t(
            'box.protocol.install.not_installed',
            'Is Not Installed, do you wish to Install it?'
          )}`,
          title: title
        })
        if (response === 0) {
          const { filePaths, canceled } = await dialog.showOpenDialog({
            buttonLabel: i18next.t('box.choose'),
            properties: ['openDirectory'],
            title: i18next.t('install.path', 'Select Install Path')
          })
          if (canceled) {
            return
          }
          if (filePaths[0]) {
            return window.webContents.send('installGame', {
              appName: app_name,
              runner,
              installPath: filePaths[0]
            })
          }
        }
        if (response === 1) {
          return logInfo('Not installing game', LogPrefix.ProtocolHandler)
        }
      }
      mainWindow.hide()
      window.webContents.send('launchGame', arg, runner)
    }, 3000)
  }
}
