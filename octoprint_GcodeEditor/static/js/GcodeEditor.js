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

        const BSEL = '#files div.btn-group.action-buttons';
        var _loadingFile = false;
        var _firstRun = true;
        var _selectedFilePath;
        self.files = null;
        self.title = ko.observable();
        self.gcodeTextArea = ko.observable();
        self.destinationFilename = ko.observable();
        self.maxGcodeSize = ko.observable();
        self.maxGcodeSizeMobile = ko.observable();
        self.layerHeight = ko.observable();
        self.gcodeHeight = ko.observable();
        
        self.cutGcode = ko.pureComputed(function() {
            var gtext = self.gcodeTextArea();
            var process = false;
            var layerHeightP = self.settings.settings.plugins.GcodeEditor.layerHeight();
            var gcodeHeightP = self.gcodeHeight();
            var data = gtext.split('\n');
            var height = 0;
            const gtextcut = [];

            if (gcodeHeightP <= layerHeightP) return;

            for(let line of data) {
                if (line[3] === 'Z') {
                    let z = line.indexOf('Z');
                    let f = line.indexOf('F');
                    let speed = Number(line.slice(f+1,-1));
                    height = Number(line.slice(z+1,f-1));
                    line = "G1 Z" + (height-gcodeHeightP).toFixed(3) + " F" + speed.toFixed(3);
                }
                // In case of custom Z nozzle movements at the beginning, let's assume there is a comment at the end of the line
                if (height > gcodeHeightP  && process === falsee && !(line.includes(';'))) {
                    gtextcut.push("G28 X Y ; home X Y");
                    gtextcut.push("G21 ; set units to millimeters");
                    gtextcut.push("G90 ; use absolute coordinates");
                    gtextcut.push("M83 ; use relative distances for extrusion");
                    process = true;
                }
                if (process === true) {
                    gtextcut.push(line);
                } else if (line[0] !== 'G' && !(line.includes('M500'))) {
                    gtextcut.push(line);
                }
            }
            self.gcodeTextArea(gtextcut.join('\n'));
        });

        self.saveGcode = ko.pureComputed(function() {
            var fName = self._sanitize(self.destinationFilename());
            var gtext = self.gcodeTextArea();

            var file = new Blob([gtext], { type: "text/plain" });

            OctoPrint.files.upload("local", file, { filename: fName, path: _selectedFilePath });

            $('#gcode_edit_dialog').modal('hide');
        });

        self.canSaveGcode = ko.pureComputed(function() {
            return !(self.printerState.isPrinting() && self.printerState.filename() === self.destinationFilename());
        });

        self.saveGcodeButtonTooltip = ko.pureComputed(function() {
            if(!self.canSaveGcode()) {
                return gettext("Cannot edit gcode of file that is currently printing");
            } else {
                return gettext("Save gcode");
            }
        });

        function dbg(...args) {
            console.info(`%c GCodeEditor `,
                'color: white; font-weight: bold; background: #21cf7a',
                ...args);
        }

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
                },
                beforeSend: function() {
                    $('#loading_modal').modal('show');
                }
                // Done
            }).done(function(data) {
                onloadCallback();

                self.title(header);

                self.destinationFilename(name);

                self.gcodeHeight(0.0);

                self.gcodeTextArea(data);

                $('#gcode_edit_dialog').modal('show');
            });
        }

        $('body').on('shown', '#gcode_edit_dialog', function(e) {
            $('#loading_modal').modal('hide');
        });

        function removeEditButtons() {
            $('div.editGcode').remove();
        }

        function disableEditButton(name, reason) {
            var select = _.sprintf(gettext('div.gcode_files .title:contains("%(filename)s")'), { filename: name });
            var gc = $(select).parent().children('div.btn-group.action-buttons').children('.editGcode');

            if(gc) {
                gc.addClass('disabled');

                if(reason.length > 0) {
                    gc.prop('title', reason);
                }
            }
        }

        function enableEditButton(name) {
            var select = _.sprintf(gettext('#files div.gcode_files .title:contains("%(filename)s")'), { filename: name });
            var gc = $(select).parent().children('div.btn-group.action-buttons').children('.editGcode');

            if(gc) {
                gc.removeClass('disabled');
                gc.prop('title', 'Edit');
            }
        }

        function setEditButton(title_text, enabled = true) {
            var div = document.createElement("div");
            var i = document.createElement("i");
            div.classList = "btn btn-mini editGcode";
            i.classList = "fas fa-edit";
            div.appendChild(i);
            div.title = encodeQuotes(gettext(title_text));
            enabled || div.classList.add("disabled");
            return div;
        }

        // Modified from M33-Fio https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L5026
        // Add edit buttons to G-code
        function addEditButtonsToGcode() {
            // Go through all file entries
            $(BSEL).each(function() {

                // Check if file is G-code
                if($(this).children().children('i.fas.fa-print').length) {
                    var url = $(this).children('a.btn.btn-mini').attr('href');
                    var size = _bytesFromSize($(this).parent().children('div.size').text());

                    // Add edit button
                    if(!$(this).children('a.btn.btn-mini').hasClass('disabled')) {
                        if(size > self.maxGcodeSize() || (OctoPrint.coreui.browser.mobile && size > self.maxGcodeSizeMobile())) {
                            $(this).children('a.btn.btn-mini').after(setEditButton("File size too large", false));
                        }
                        else if(url.indexOf("/files/local/") === -1) {
                            $(this).children('a.btn.btn-mini').after(setEditButton("Not local file", false));
                        }
                        else if(self.printerState.isPrinting() && self.printerState.filename() === $(this).parent().children('div.title').text()) {
                            $(this).children('a.btn.btn-mini').after(setEditButton("File is currently printing", false));
                        }
                        else {
                            $(this).children('a.btn.btn-mini').after(setEditButton("Edit"));
                        }
                    }
                }
                else {
                    console.warn('FAILURE');
                }
            });

            // Check if user isn't logged in
            if(!self.loginState.loggedIn()) {
                // Disable edit buttons
                $('div.editGcode').addClass('disabled');
            }

            // Edit button click event
            $('div.editGcode').click(function() {
                var button = $(this);

                // Blur self
                button.blur();

                // Check if button is not disabled
                if(!button.hasClass('disabled')) {

                    // Check if not already loading file
                    if(!_loadingFile) {

                        // Set loading file
                        _loadingFile = true;

                        // Enable other edit buttons
                        // $('#files div.gcode_files .action-buttons div.btn-mini.editGcode').removeClass('disabled');

                        // Set icon to spinning animation
                        button.addClass('disabled').children('i').removeClass('fas fa-edit').addClass('icon-spinner icon-spin');

                        setTimeout(function() {

                            var furl = button.parent().children('a.btn-mini').attr('href');
                            var fname = button.parent().parent().children('div.title').text();
                            var fheader = _.sprintf(gettext("Editing %(fileName)s"),
                                {
                                    fileName: htmlEncode(typeof self.files.currentPath === "undefined" ||
                                        self.files.currentPath().length == 0 ? "" : "/" + self.files.currentPath() + "/") + fname
                                })

                            // Show G-code editor
                            showGcodeEditor(furl, fname, fheader, function() {
                                setTimeout(function() {
                                    // Clear loading file
                                    _loadingFile = false;

                                    // Restore edit icon and enable button
                                    button.removeClass('disabled').children('i').removeClass('icon-spinner icon-spin').addClass('fas fa-edit');
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
            while (entry && entry.hasOwnProperty("parent") && typeof entry["parent"] !== "undefined")

                // Set entry to its parent
                entry = entry["parent"];

            // Return entry
            return entry;
        }

        // Get G-code path and name
        function getGcodePathAndName(entry, gcodeUrl) {

            // Check if entry is a folder
            if(entry && entry.hasOwnProperty("children"))

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
            return name.replace(/[^a-zA-Z0-9\-_\.\(\) ]/g, "");
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

    OCTOPRINT_VIEWMODELS.push({
        construct: GcodeEditorViewModel,
        dependencies: ["filesViewModel", "loginStateViewModel", "printerStateViewModel", "settingsViewModel"],
        elements: ["#gcode_edit_dialog"]
    });
});
