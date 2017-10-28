# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import octoprint.filemanager

class GcodeEditorPlugin(octoprint.plugin.StartupPlugin,
                        octoprint.plugin.ShutdownPlugin,
						octoprint.plugin.TemplatePlugin,
						octoprint.plugin.EventHandlerPlugin,
                        octoprint.plugin.AssetPlugin):
    def on_after_startup(self):
        self._logger.info("Hello World! (more: %s)" % 'shit')

    # def get_settings_defaults(self):
    #     return dict(url="https://en.wikipedia.org/wiki/Hello_world")

    # def get_template_configs(self):
    #     return [
    #         dict(type="navbar", custom_bindings=False),
    #         dict(type="settings", custom_bindings=False)
    #     ]

    def get_assets(self):
     return dict(
         js=["js/GcodeEditor.js"],
         css=["css/GcodeEditor.css"]
     )

__plugin_name__ = "GcodeEditor"
__plugin_implementation__ = GcodeEditorPlugin()