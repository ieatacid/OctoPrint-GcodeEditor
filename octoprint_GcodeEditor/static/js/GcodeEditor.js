/*
 * View model for OctoPrint-GcodeEditor
 *
 * Author: ieatacid
 * License: AGPLv3
 */
$(function() {
    function GcodeEditorViewModel(parameters) {
        var self = this;

        self.filesViewModel = parameters[0];
        self.loginState = parameters[1];
        self.printerState = parameters[2];
        self.settings = parameters[3];

        var _loadingFile = false;
        var _firstRun = true;
        var _selectedFilePath;
        self.files = null;
        self.title = ko.observable();
        self.gcodeTextArea = ko.observable();
        self.destinationFilename = ko.observable();
        self.maxGcodeSize = ko.observable();
        self.maxGcodeSizeMobile = ko.observable();

        self.saveGcode = function() {
            var fName = self._sanitize(self.destinationFilename());
            var gtext = self.gcodeTextArea();

            var file = new File([gtext], _selectedFilePath + fName, { type: "text/plain" });

            OctoPrint.files.upload("local", file);

            $("#gcode_edit_dialog").modal("hide");
        }

        self.canSaveGcode = ko.pureComputed(function() {
            return !(self.printerState.isPrinting() && self.printerState.filename() === self.destinationFilename());
        });

        self.saveGcodeButtonTooltip = ko.pureComputed(function() {
            if (!self.canSaveGcode()) {
                return gettext("Cannot edit gcode of file that is currently printing");
            } else {
                return gettext("Save gcode");
            }
        });

        // Modified from M33-Fio https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L3970
        function showGcodeEditor(url, name, header, onloadCallback, delay) {
            var str = getGcodePathAndName(getRootFilePath(), url);

            if(str.split("/").length > 2) {
                _selectedFilePath = str.substring(1, str.lastIndexOf("/")) + "/";
            } else {
                _selectedFilePath = "";
            }

            // Send request
            $.ajax({
                url: url,
                type: "GET",
                dataType: "text",
                data: null,
                contentType: "application/x-www-form-urlencoded; charset=UTF-8",
                traditional: true,
                processData: true,
                headers: {
                    "Pragma": "no-cache",
                    "Expires": "0",
                    "Cache-Control": "no-cache, no-store, must-revalidate"
                }
            // Done
            }).done(function(data) {
                onloadCallback();

                self.title(header);

                self.destinationFilename(name);

                self.gcodeTextArea(data);

                $("#gcode_edit_dialog").modal("show");                
            });
        }

        function removeEditButtons() {
            $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").remove();
        }

        function disableEditButton(name, reason) {
            var select = _.sprintf(gettext("#files div.gcode_files div.entry .title:contains('%(filename)s')"), {filename: name});

            if($(select).parent().children().eq(4).children().eq(2).hasClass('editGcode')) {
                $(select).parent().children().eq(4).children().eq(2).addClass('disabled');

                if(reason.length > 0) {
                    $(select).parent().children().eq(4).children().eq(2).prop('title', reason);
                }
            }
        }

        function enableEditButton(name) {
            var select = _.sprintf(gettext("#files div.gcode_files div.entry .title:contains('%(filename)s')"), {filename: name});

            if($(select).parent().children().eq(4).children().eq(2).hasClass('editGcode')) {
                $(select).parent().children().eq(4).children().eq(2).removeClass('disabled');
                $(select).parent().children().eq(4).children().eq(2).prop('title', 'Edit');
            }
        }

        // Modified from M33-Fio https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L5026
        // Add edit buttons to G-code
        function addEditButtonsToGcode() {

            // Remove all edit buttons
            // $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").remove();

            // Go through all file entries
            $("#files div.gcode_files div.entry .action-buttons").each(function() {

                // Check if file is G-code
                if($(this).children().children("i.icon-print, i.fa.fa-print").length) {
                    var url = $(this).children().eq(1).attr("href");
                    var size = _bytesFromSize($(this).parent().children().eq(2).text());

                    // Add edit button
                    if(!$(this).children().eq(1).hasClass("disabled")) {
                        if(size > self.maxGcodeSize() || (OctoPrint.coreui.browser.mobile && size > self.maxGcodeSizeMobile())) {
                            $(this).children("a.btn-mini").after("\
                                <div class=\"btn btn-mini editGcode disabled\" title=\"" + encodeQuotes(gettext("File size too large")) + "\">\
                                    <i class=\"icon-pencil\"></i>\
                                </div>\
                            ");
                        }
                        else if(url.indexOf("/files/local/") === -1) {
                            $(this).children("a.btn-mini").after("\
                                <div class=\"btn btn-mini editGcode disabled\" title=\"" + encodeQuotes(gettext("Not local file")) + "\">\
                                    <i class=\"icon-pencil\"></i>\
                                </div>\
                            ");
                        }
                        else if(self.printerState.isPrinting() && self.printerState.filename() === $(this).children().parent().parent().children().eq(0).text()) {
                            $(this).children("a.btn-mini").after("\
                                <div class=\"btn btn-mini editGcode disabled\" title=\"" + encodeQuotes(gettext("File is currently printing")) + "\">\
                                    <i class=\"icon-pencil\"></i>\
                                </div>\
                            ");
                        }
                        else {
                            $(this).children("a.btn-mini").after("\
                                <div class=\"btn btn-mini editGcode\" title=\"" + encodeQuotes(gettext("Edit")) + "\">\
                                    <i class=\"icon-pencil\"></i>\
                                </div>\
                            ");
                        }
                    }
                }
            });

            // Check if user isn't logged in
            if(!self.loginState.loggedIn()) {
                // Disable edit buttons
                $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").addClass("disabled");
            }

            // Edit button click event
            $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").click(function() {

                var button = $(this);

                // Blur self
                button.blur();

                // Check if button is not disabled
                if(!button.hasClass("disabled")) {

                    // Check if not already loading file
                    if(!_loadingFile) {

                        // Set loading file
                        _loadingFile = true;

                        // Enable other edit buttons
                        // $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").removeClass("disabled");

                        // Set icon to spinning animation
                        button.addClass("disabled").children("i").removeClass("icon-pencil").addClass("icon-spinner icon-spin");

                        setTimeout(function() {

                            // Show G-code editor
                            showGcodeEditor(button.parent().children("a.btn-mini").attr("href"),        // url,
                                button.parent().parent().children("div").eq(0).text(),                  // name,
                                _.sprintf(gettext("Editing %(fileName)s"),                              // header,
                                    {fileName: htmlEncode(typeof self.files.currentPath === "undefined" ||
                                    self.files.currentPath().length == 0 ? "" :
                                    "/" + self.files.currentPath() + "/") +
                                    button.parent().parent().children("div").eq(0).html()}),
                                function() {                                                            // onloadCallback

                                    setTimeout(function() {

                                        // Clear loading file
                                        _loadingFile = false;

                                        // Restore edit icon and enable button
                                        button.removeClass("disabled").children("i").removeClass("icon-spinner icon-spin").addClass("icon-pencil");
                                    }, 0);
                                }, 0);
                        }, 200);
                    }
                }
            });

            _firstRun = false;
        }

        function _bytesFromSize(size_str) {
            return bytesFromSize(size_str.split("Size: ")[1]);
        }

        // Get root file path
        function getRootFilePath() {

            // Initialize entry
            var entry = self.files.listHelper.allItems[0];

            // Check if OctoPrint version doesn't use upload folders
            if(entry && !entry.hasOwnProperty("parent")) {

                // Construct root file path
                var root = {
                    children: {}
                };

                // Go throguh all entries
                for(var index in self.files.listHelper.allItems)

                    // Add entry to root's children
                    root.children[index] = self.files.listHelper.allItems[index];

                // Return root
                return root;
            }

            // Loop while entry has a parent
            while(entry && entry.hasOwnProperty("parent") && typeof entry["parent"] !== "undefined")

                // Set entry to its parent
                entry = entry["parent"];

            // Return entry
            return entry;
        }

        // Get G-code path and name
        function getGcodePathAndName(entry, gcodeUrl) {

            // Check if entry is a folder
            if (entry && entry.hasOwnProperty("children"))

                // Go through each entry in the folder
                for(var child in entry.children) {

                    // Check if current child is the specified G-code file
                    var value = getGcodePathAndName(entry.children[child], gcodeUrl);
                    if(typeof value !== "undefined")

                        // Return upload date
                        return value;
                }

            // Otherwise check if entry is the specified G-code file
            else if(entry && entry.hasOwnProperty("name") && entry.refs && entry.refs.hasOwnProperty("download") && entry["refs"]["download"] === gcodeUrl)

                // Return path and name
                return (typeof self.files.currentPath !== "undefined" ? "/" : "") + (entry.hasOwnProperty("path") ? entry["path"] : entry["name"]);
        }

        // Encode quotes https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L681
        function encodeQuotes(text) {

            // Return text with encoded quotes
            return String(text).replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/`/g, "&#96;");
        }

        // Encode html entities https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L688
        function htmlEncode(value) {

            // Return encoded html
            return $("<div>").text(value).html().replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/`/g, "&#96;");
        }

        // https://github.com/foosel/OctoPrint/blob/master/src/octoprint/static/js/app/viewmodels/slicing.js#L294
        self._sanitize = function(name) {
            return name.replace(/[^a-zA-Z0-9\-_\.\(\) ]/g, "").replace(/ /g, "_");
        };

        self.onStartupComplete = function() {
            self.maxGcodeSize(bytesFromSize(self.settings.settings.plugins.GcodeEditor.maxGcodeSize()));
            self.maxGcodeSizeMobile(bytesFromSize(self.settings.settings.plugins.GcodeEditor.maxGcodeSizeMobile()));

            addEditButtonsToGcode();
        }

        self.onSettingsHidden = function() {
            self.maxGcodeSize(bytesFromSize(self.settings.settings.plugins.GcodeEditor.maxGcodeSize()));
            self.maxGcodeSizeMobile(bytesFromSize(self.settings.settings.plugins.GcodeEditor.maxGcodeSizeMobile()));

            removeEditButtons();
            addEditButtonsToGcode();
        }

        self.onAllBound = function(payload) {

            // Modified from M33-Fio https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L18516
            // Go through all view models
            for(var viewModel in payload) {

                // Otherwise check if view model is files view model
                if(payload[viewModel].constructor.name === "FilesViewModel" || payload[viewModel].constructor.name === "GcodeFilesViewModel") {

                    // Set files
                    self.files = payload[viewModel];

                    // Replace list helper update items
                    var originalUpdateItems = self.files.listHelper._updateItems;
                    self.files.listHelper._updateItems = function() {

                        // Update items
                        originalUpdateItems();

                        removeEditButtons();
                        addEditButtonsToGcode();
                    }
                }
            }
        }

        self.onUserLoggedIn = function() {
            if(!_firstRun) {
                removeEditButtons();
                addEditButtonsToGcode();
            }
        }

        self.onUserLoggedOut = function() {
            removeEditButtons();
        }

        self.onEventPrintStarted = function(payload) {
            disableEditButton(payload.name, "Can't edit while printing");
        }

        self.onEventPrintDone = function(payload) {
            var fileName = payload.file.substr(payload.file.lastIndexOf("/") + 1, payload.file.length);

            setTimeout(function() {
                enableEditButton(fileName);
            }, 100);
        }
    }

    OCTOPRINT_VIEWMODELS.push([
        GcodeEditorViewModel,

        ["filesViewModel", "loginStateViewModel", "printerStateViewModel", "settingsViewModel"],
        ["#gcode_edit_dialog"]
    ]);
});
