# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import octoprint.filemanager

class GcodeEditorPlugin(octoprint.plugin.TemplatePlugin,
                        octoprint.plugin.AssetPlugin):

    def get_assets(self):
     return dict(
         js=["js/GcodeEditor.js"],
         css=["css/GcodeEditor.css"]
     )

__plugin_name__ = "GcodeEditor"
__plugin_implementation__ = GcodeEditorPlugin()
__plugin_version__ = "0.1.1"
