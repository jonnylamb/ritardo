require.config({
    "paths": {
        "jquery": "https://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min",
        "underscore": "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.2/underscore-min"
    }
});

require(["ritardo"], function(Ritardo) {
    Ritardo.go("ROMA TUSCOLANA", "QUATTRO VENTI");
});
