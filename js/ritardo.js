define(["jquery", "underscore",
        "tpl!templates/detailsOk", "tpl!templates/detailsEarly",
        "tpl!templates/detailsLate", "tpl!templates/detailsNoData",
        "tpl!templates/header", "tpl!templates/loading"],
       function($, _,
                templateDetailsOk, templateDetailsEarly,
                templateDetailsLate, templateDetailsNoData,
                templateHeader, templateLoading) {
    var Train = function(data) {
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
    };

    var Ritardo = {
        go: function(from, to) {
            Ritardo.FROM = from;
            Ritardo.TO = to;

            var content = $("#content");

            // title
            content.append(templateHeader({from: from, to: to}));

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
                        results[date].push(new Train(data));
                    });

                    deferreds.push(d);
                });
            });

            $.when.apply(window, deferreds).then(function() {
                Ritardo._gotTrainData(results);
            });
        },

        getUniqueTrains: function(results) {
            var trains = _.reduce(results, function(memo, result) {
                return memo.concat(_.filter(result, function(train) {
                    return train.hasStations;
                }));
            }, []);

            var sortedTrains = _.sortBy(trains, function(train) {
                return train.time()
            });

            var uniqueTrains = _.uniq(sortedTrains, false, function(train) {
                return train.number();
            });

            return uniqueTrains;
        },

        findTrain: function(trains, unique) {
            return _.find(trains, function(train) {
                return (train.number() == unique.number());
            });
        },

        createDetails: function(station, key, verb, earlyIsBad) {
            var templ;
            var lateness = station[key];

            // up to and including three minutes late is fine
            if ((lateness <= 3 && lateness >= 0) || (lateness < 0 && !earlyIsBad))
                templ = templateDetailsOk;
            else if (lateness < 0 && earlyIsBad)
                templ = templateDetailsEarly;
            else
                templ = templateDetailsLate;

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
                $("#header-times")
                    .append($("<th>")
                            .text(s));
            });

            Ritardo.setLoadingText("Filling table...");

            // start filling in the real data
            var keys = _.keys(results);
            _.each(keys.sort(), function(date) {
                var d = new Date(date);
                var row = $("<tr>");
                $("<td>")
                    .text(d.toDateString())
                    .addClass("nowrap")
                    .appendTo(row);

                _.each(uniques, function(unique) {

                    var train = Ritardo.findTrain(results[date], unique);

                    var cell = $("<td>").appendTo(row);

                    // when there is no information about the train
                    if (train === undefined || !train.hasStations) {
                        cell.append(templateDetailsNoData);
                        cell.append(templateDetailsNoData);
                        return; // continue
                    }

                    var details;

                    details = Ritardo.createDetails(train.fromStation,
                                                    "ritardoPartenza",
                                                    "leaving", true);
                    cell.append(details);
                    details = Ritardo.createDetails(train.toStation,
                                                    "ritardoArrivo",
                                                    "arriving into", false);
                    cell.append(details);
                });

                $("#data").append(row);
            });

            $("#loading").remove();
            $("#trains").show();
        },

        setLoadingText: function(text) {
            $("#loading").html(templateLoading({text: text}));
        },
    };

    return Ritardo;
});
