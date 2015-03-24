define(["jquery", "underscore", "moment",
        // templates
        "tpl!templates/detailsOk", "tpl!templates/detailsEarly",
        "tpl!templates/detailsLate", "tpl!templates/detailsNoData",
        "tpl!templates/header", "tpl!templates/loading",
        "tpl!templates/progress",
        // jquery extension
        "jquery.whenall"],
       function($, _, moment,
                templateDetailsOk, templateDetailsEarly,
                templateDetailsLate, templateDetailsNoData,
                templateHeader, templateLoading, templateProgress) {
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
            // the two keys per station that seem legit are
            // 'programmata' and 'effettiva'. the former just isn't
            // the official time of the stop whereas the latter is one
            // minute behind. adding 1 min to the timestamp so it
            // doesn't have to be though about later is easiest.
            var d = moment(s.programmata).add(1, "minutes");

            // we just want the time so set a fixed date
            d = d.year(2015).month(0).date(1);

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

        updateProgress: function(results, deferreds) {
            var done = 0;
            for (date in results)
                done += results[date].length;

            var percentage = Math.floor((done / deferreds.length) * 100);
            $("#train-progress").css("width", percentage + "%");
            $("#train-progress").attr("aria-valuenow", percentage);
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
                        Ritardo.updateProgress(results, deferreds);
                    });

                    deferreds.push(d);
                });
            });

            // add progressbar
            $("#loading").append(templateProgress({percentage: 0}));

            // use whenAll here as all train files need to be
            // downloaded before we can move on.
            $.whenAll.apply(window, deferreds)
                .always(function() {
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

            function pad(n) {
                return (n < 10) ? ("0" + n) : n;
            }

            _.each(uniques, function(t) {
                var s = t.time()
                    .format("HH:mm");

                $("#header-times")
                    .append($("<th>")
                            .text(s));
            });

            Ritardo.setLoadingText("Filling table...");

            // start filling in the real data
            var keys = _.keys(results);
            _.each(keys.sort(), function(date) {
                var d = moment(date);
                var row = $("<tr>");
                $("<td>")
                    .text(d.format("ddd Do MMMM YYYY"))
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
            $("#trains").show(100);
        },

        setLoadingText: function(text) {
            $("#loading").html(templateLoading({text: text}));
        },
    };

    return Ritardo;
});
