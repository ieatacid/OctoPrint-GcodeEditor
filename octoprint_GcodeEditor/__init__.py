# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import octoprint.filemanager.storage
import flask

class GcodeEditorPlugin(octoprint.plugin.TemplatePlugin,
                        octoprint.plugin.AssetPlugin,
                        octoprint.plugin.SettingsPlugin):

    def get_assets(self):
        return dict(
            js=["js/GcodeEditor.js"],
        )

    def get_settings_defaults(self):
        return dict(
            maxGcodeSize="10MB",
            maxGcodeSizeMobile="5MB"
        )

    def get_template_configs(self):
        return [
            dict(type="settings", custom_bindings=False)
        ]

    def get_update_information(self):
        return dict(
            emergencyaction=dict(
                displayName="GcodeEditor Plugin",
                displayVersion=self._plugin_version,

                type="github_release",
                user="ieatacid",
                repo="OctoPrint-GcodeEditor",
                current=self._plugin_version,

                pip="https://github.com/ieatacid/OctoPrint-GcodeEditor/archive/{target_version}.zip"
            )
        )

__plugin_name__ = "GcodeEditor"

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = GcodeEditorPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
    }
