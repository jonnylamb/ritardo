var Ritardo = {
    Train: function(data) {
        this.data = data;

        this.fromStation = null;
        this.toStation = null;
        this.hasStations = false;

        var matches = _.filter(this.data.fermate, function(stop) {
            return (stop.stazione == Ritardo.FROM ||
                    stop.stazione == Ritardo.TO);
        });
        if (matches.length == 2) {
            this.fromStation = matches[0];
            this.toStation = matches[1];
            this.hasStations = true;
        }

        this.number = function() {
            return this.data.numeroTreno;
        };

        this.time = function() {
            var s = this.fromStation;
            var d = new Date(s.programmata);

            d.setFullYear(1970);
            d.setMonth(1); // not sure if these are actually zero
            d.setDate(1); // indexed, but it doesn't matter in this case

            return d;
        };
    },

    go: function(from, to) {
        Ritardo.FROM = from;
        Ritardo.TO = to;

        var content = $("#content");

        // title
        content.append($("<h1>Trains between " + from + " and " + to + "</h1>"));

        // spinner
        content.append($("<p></p>").attr("id", "loading"));
        Ritardo.setLoadingText("Loading...");

        // go!
        Ritardo.setLoadingText("Getting train list...");
        $.ajax("filelist.json").done(Ritardo._gotFileList);
    },

    _gotFileList: function(filelist) {
        Ritardo.setLoadingText("Getting train data...");

        var results = {};
        var deferreds = [];

        _.each(_.keys(filelist), function(date) {
            results[date] = [];
            _.each(filelist[date], function(filename) {
                var d = $.ajax(date + "/" + filename);

                d.done(function(data) {
                    results[date].push(new Ritardo.Train(data));
                });

                deferreds.push(d);
            });
        });

        $.when.apply(window, deferreds).then(function() {
            Ritardo._gotTrainData(results);
        });
    },

    getUniqueTrains: function(results) {
        var uniques = {};

        _.each(results, function(trains) {
            _.each(trains, function(train) {
                if (!(train.number() in uniques) && train.hasStations) {
                    uniques[train.number()] = train;
                }
            });
        });

        uniques = _.values(uniques);

        return uniques.sort(function(a, b) {
            return a.time() - b.time();
        });
    },

    _gotTrainData: function(results) {
        Ritardo.setLoadingText("Processing train data...");

        // get unique list of train numbers from all days
        var uniques = Ritardo.getUniqueTrains(results);

        Ritardo.setLoadingText("Updating table headings...");

        _.each(uniques, function(t) {
            var d = t.time();
            var s = d.getHours() + ":" + (d.getMinutes()+1);
            $("#header-times").append($("<th></th>").attr("colspan", "2").text(s));
            $("#header-leaving-arriving").append($("<th>Leaving</th><th>Arriving</th>"));
        });

        Ritardo.setLoadingText("Getting templates...");
        var okDeferred = $.get("templates/details-ok.html");
        var lateDeferred = $.get("templates/details-late.html");
        var earlyDeferred = $.get("templates/details-early.html");
        var naDeferred = $.get("templates/details-na.html");

        $.when(okDeferred, lateDeferred, earlyDeferred, naDeferred).done(
            function(okData, lateData, earlyData, naData) {
                Ritardo._gotTemplates(results, uniques,
                                      okData[0], lateData[0], earlyData[0], naData[0]);
            });
    },

    findTrain: function(trains, unique) {
        return _.find(trains, function(train) {
            return (train.number() == unique.number());
        });
    },

    createDetails: function(station, key, verb, ok, late, early, earlyIsBad) {
        var templ;
        var lateness = station[key];

        if (lateness === 0 || (lateness < 0 && !earlyIsBad))
            templ = ok;
        else if (lateness < 0 && earlyIsBad)
            templ = early;
        else
            templ = late;

        return templ({
            stationName: station.stazione,
            verb: verb,
            minsLate: Math.abs(lateness)
        });
    },

    _gotTemplates: function(results, uniques, okData, lateData, earlyData, naData) {
        var ok = _.template(okData);
        var late = _.template(lateData);
        var early = _.template(earlyData);
        var na = _.template(naData);

        // start filling in the real data
        for (var date in results) {
            var d = new Date(date);
            var row = $("<tr><td>" + d.toDateString() + "</td></tr>");

            _.each(uniques, function(unique) {

                var train = Ritardo.findTrain(results[date], unique);

                // when there is no information about the train
                if (train === null) {
                    row.append(na());
                    row.append(na());
                    return; // continue
                }

                row.append(Ritardo.createDetails(train.fromStation,
                                                 "ritardoPartenza", "leaving",
                                                 // todo: remove templates from here
                                                 ok, late, early,
                                                 true));
                row.append(Ritardo.createDetails(train.toStation,
                                                 "ritardoArrivo", "arriving into",
                                                 // todo: and here
                                                 ok, late, early,
                                                 false));
            });

            $("#data").append(row);
        }

        $("#loading").remove();
        $("#trains").show();
    },

    setLoadingText: function(text) {
        $("#loading").html($("<img src=\"images/loading.gif\"> " + text + "</p>"));
    },
};
