import { plat } from './platform';
import type { GrokController } from './controller';
import type { WebviewToHost } from './types';

export async function dispatchUi(controller: GrokController, message: WebviewToHost): Promise<void> {
  switch (message.type) {
    case 'ready':
      controller.emit();
      return;
    case 'login':
      await controller.login();
      return;
    case 'openLoginUrl':
      await controller.openLoginUrl();
      return;
    case 'submitAuthCode':
      await controller.submitAuthCode(message.code);
      return;
    case 'cancelLogin':
      await controller.cancelLogin();
      return;
    case 'setApiKey':
      await controller.setApiKey(message.key);
      return;
    case 'logout':
      await controller.logout();
      return;
    case 'send':
      await controller.send(message.text);
      return;
    case 'cancel':
      controller.cancelTurn();
      return;
    case 'newSession':
      await controller.newSession();
      return;
    case 'restart':
      await controller.restart();
      return;
    case 'choosePermission':
      controller.choosePermission(message.optionId);
      return;
    case 'cancelPermission':
      controller.cancelPermission();
      return;
    case 'removeAttachment':
      controller.removeAttachment(message.id);
      return;
    case 'openFile':
      await plat().openFile(message.path, true);
      return;
    case 'openUrl': {
      if (!/^https?:/i.test(message.url) && !message.url.toLowerCase().startsWith('mailto:')) {
        return;
      }
      await plat().openExternal(message.url);
      return;
    }
    case 'setModel':
      await controller.setModel(message.modelId);
      return;
    case 'setMode':
      await controller.setMode(message.modeId);
      return;
    case 'setEffort':
      await controller.setEffort(message.level);
      return;
    case 'installCli':
      await controller.installCli();
      return;
    case 'openDrawer':
      if (message.drawer === 'sessions') {
        await controller.resumePicker();
      } else if (message.drawer === 'history') {
        await controller.send('/history');
      } else {
        await controller.send(`/${message.tab ?? 'mcps'}`);
      }
      return;
    case 'closeDrawer':
      controller.closeDrawer();
      return;
    case 'loadSession':
      await controller.loadSession(message.sessionId, message.cwd);
      return;
    case 'rewindTo':
      await controller.rewindTo(message.index);
      return;
    case 'searchFiles':
      await controller.searchFiles(message.query);
      return;
    case 'pickFile':
      controller.pickFile(message.path);
      return;
    case 'copyLast':
      controller.copyLast();
      return;
    case 'copyText':
      await plat().clipboardWrite(message.text);
      return;
    case 'exportChat':
      await controller.exportChat();
      return;
    case 'attach':
      await controller.attachFromUi();
      return;
    case 'openSettings':
      controller.openSettings();
      return;
    case 'closeSettings':
      controller.closeSettings();
      return;
    case 'openRules':
      controller.openRules();
      return;
    case 'closeRules':
      controller.closeRules();
      return;
    case 'importRules':
      await controller.importRules();
      return;
    case 'toggleRule':
      await controller.toggleRule(message.id);
      return;
    case 'deleteRule':
      await controller.deleteRule(message.id);
      return;
    case 'openRule':
      controller.openRule(message.id);
      return;
    case 'openSkills':
      controller.openSkills();
      return;
    case 'closeSkills':
      controller.closeSkills();
      return;
    case 'importSkillZip':
      await controller.importSkillZip();
      return;
    case 'importSkillFolder':
      await controller.importSkillFolder();
      return;
    case 'toggleSkill':
      await controller.toggleSkill(message.id);
      return;
    case 'deleteSkill':
      await controller.deleteSkill(message.id);
      return;
    case 'openSkill':
      controller.openSkill(message.id);
      return;
    case 'updateSetting':
      await controller.updateSetting(message.key, message.value);
      return;
    case 'toggleFlag':
      controller.toggleUiFlag(message.flag);
      return;
    case 'runSlash':
      await controller.send(`/${message.command}`);
      return;
    case 'pasteClipboard':
      await controller.pasteClipboard(message);
      return;
    case 'undoEdits':
      await controller.undoEdits(message.messageId);
      return;
    case 'reviewEdits':
      await controller.reviewEdits(message.messageId, message.path);
      return;
    case 'openEdit':
      controller.openEdit(message.path, message.messageId);
      return;
    default:
      return;
  }
}
