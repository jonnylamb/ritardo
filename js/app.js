require.config({
    "paths": {
        "templates": "../templates",
        "jquery": "https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min",
        "underscore": "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore-min",
        "moment": "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.9.0/moment.min",
        "tpl": "https://cdn.rawgit.com/jfparadis/requirejs-tpl/master/tpl",
        "text": "https://cdn.rawgit.com/requirejs/text/master/text"
    }
});

require(["ritardo"], function(Ritardo) {
    Ritardo.go("ROMA TUSCOLANA", "QUATTRO VENTI");
});
