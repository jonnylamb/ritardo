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

    findTrain: function(trains, unique) {
        return _.find(trains, function(train) {
            return (train.number() == unique.number());
        });
    },

    createDetails: function(station, key, verb, earlyIsBad) {
        var templ;
        var lateness = station[key];

        if (lateness === 0 || (lateness < 0 && !earlyIsBad))
            templ = _.template($("#detailsOk").text());
        else if (lateness < 0 && earlyIsBad)
            templ = _.template($("#detailsEarly").text());
        else
            templ = _.template($("#detailsLate").text());

        return templ({
            stationName: station.stazione,
            verb: verb,
            minsLate: lateness
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

        Ritardo.setLoadingText("Filling table...");

        // start filling in the real data
        for (var date in results) {
            var d = new Date(date);
            var row = $("<tr><td>" + d.toDateString() + "</td></tr>");

            _.each(uniques, function(unique) {

                var train = Ritardo.findTrain(results[date], unique);

                // when there is no information about the train
                if (train === null) {
                    var templ = _.template($("#detailsNoData").text());
                    row.append(templ);
                    row.append(templ);
                    return; // continue
                }

                row.append(Ritardo.createDetails(train.fromStation,
                                                 "ritardoPartenza", "leaving", true));
                row.append(Ritardo.createDetails(train.toStation,
                                                 "ritardoArrivo", "arriving into", false));
            });

            $("#data").append(row);
        }

        $("#loading").remove();
        $("#trains").show();
    },

    setLoadingText: function(text) {
        var template = _.template($("#loadingTemplate").text());
        $("#loading").html(template({text: text}));
    },
};
