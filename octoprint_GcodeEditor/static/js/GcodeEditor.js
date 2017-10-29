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

        var loadingFile = false;
        self.files = null;
        self.title = ko.observable();
        self.gcodeTextArea = ko.observable();
        self.destinationFilename = ko.observable();

        self.saveGcode = function() {
            var fName = self._sanitize(self.destinationFilename());
            var gtext = self.gcodeTextArea();

            var file = new File([gtext], fName, { type: "text/plain", });

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

        self.onStartupComplete = function() {
            // Add edit buttons to G-code
            addEditButtonsToGcode();
        }

        self.onAllBound = function(payload) {

            // Modified from M33-Fio https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L18516
            // Go through all view models
            for(var viewModel in payload) {

                // Otherwise check if view model is files view model
                if(payload[viewModel].constructor.name === "GcodeFilesViewModel" || payload[viewModel].constructor.name === "FilesViewModel") {
                    
                    // Set files
                    self.files = payload[viewModel];
                    
                    // Replace list helper update items
                    var originalUpdateItems = self.files.listHelper._updateItems;
                    self.files.listHelper._updateItems = function() {

                        // Update items
                        originalUpdateItems();
                        
                        // Add edit buttons to G-code
                        addEditButtonsToGcode();
                    }
                }
            }
        }

        // Modified from M33-Fio https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L3970
        function showGcodeEditor(url, name, header, onloadCallback, delay) {

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
        
        // Modified from M33-Fio https://github.com/donovan6000/M33-Fio/blob/master/octoprint_m33fio/static/js/m33fio.js#L5026
        // Add edit buttons to G-code
        function addEditButtonsToGcode() {

            // Remove all edit buttons
            $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").remove();
            
            // Go through all file entries
            $("#files div.gcode_files div.entry .action-buttons").each(function() {
                
                // Check if file is G-code
                if($(this).children().children("i.icon-print, i.fa.fa-print").length)
                
                    // Add edit button
                    $(this).children("a.btn-mini").after("\
                        <div class=\"btn btn-mini editGcode\" title=\"" + encodeQuotes(gettext("Edit")) + "\">\
                            <i class=\"icon-pencil\"></i>\
                        </div>\
                    ");
            });
            
            // Check if user isn't logged in
            if(!self.loginState.loggedIn()) {
                // Disable edit buttons
                $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").addClass("disabled");
            }

            // Edit button click event
            $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").click(function() {
            
                // Initialize variables
                var button = $(this);
                
                // Blur self
                button.blur();
                
                // Check if button is not disabled
                if(!button.hasClass("disabled")) {
                
                    // Check if not already loading file
                    if(!loadingFile) {
            
                        // Set loading file
                        loadingFile = true;
            
                        // Enable other edit buttons
                        $("#files div.gcode_files div.entry .action-buttons div.btn-mini.editGcode").removeClass("disabled");
                    
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
                                        loadingFile = false;
                            
                                        // Restore edit icon and enable button
                                        button.removeClass("disabled").children("i").removeClass("icon-spinner icon-spin").addClass("icon-pencil");
                                    }, 0);
                                }, 0);
                        }, 200);
                    }
                }
            });
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
    }

    OCTOPRINT_VIEWMODELS.push([
        GcodeEditorViewModel,

        ["filesViewModel", "loginStateViewModel", "printerStateViewModel"],
        ["#gcode_edit_dialog"]
    ]);
});
