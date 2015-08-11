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

        this.findStation = function(name) {
            return _.find(this.data.fermate, function(stop) {
                return (stop.stazione == name);
            });
        };

        this.stations = function(fromName, toName) {
            var from = this.findStation(fromName);
            var to = this.findStation(toName);

            if (from && to)
                return [from, to];

            return undefined;
        };

        this.number = function() {
            return this.data.numeroTreno;
        };

        this.time = function(stationName) {
            var s = this.findStation(stationName);
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

    var Ritardo = function(from, to) {
        this.from = from;
        this.to = to;

        this.setLoadingText = function(text) {
            $("#loading").html(templateLoading({text: text}));
        };

        this.go = function() {
            var content = $("#content");

            // title
            content.append(templateHeader({from: from, to: to}));

            // spinner
            content.append($("<p></p>").attr("id", "loading"));
            this.setLoadingText("Loading...");

            // go!
            this.setLoadingText("Getting train list...");
            $.ajax({
                url: "filelist.json",
                cache: false
            }).done(_.bind(this._gotFileList, this));
        };

        this.updateProgress = function(results, deferreds) {
            var done = 0;
            for (date in results)
                done += results[date].length;

            var percentage = Math.floor((done / deferreds.length) * 100);
            $("#train-progress").css("width", percentage + "%");
            $("#train-progress").attr("aria-valuenow", percentage);
        };

        this._gotFileList = function(filelist) {
            this.setLoadingText("Getting train data...");

            var results = {};
            var deferreds = [];

            _.each(_.keys(filelist), _.bind(function(date) {
                results[date] = [];
                _.each(filelist[date], _.bind(function(filename) {
                    var d = $.ajax(date + "/" + filename);

                    d.done(_.bind(function(data) {
                        results[date].push(new Train(data));
                        this.updateProgress(results, deferreds);
                    }, this));

                    deferreds.push(d);
                }, this));
            }, this));

            // add progressbar
            $("#loading").append(templateProgress({percentage: 0}));

            // use whenAll here as all train files need to be
            // downloaded before we can move on.
            $.whenAll.apply(window, deferreds)
                .always(_.bind(function() {
                    this.gotTrainData(results);
                }, this));
        };

        this.getUniqueTrains = function(results) {
            var trains = _.reduce(results, _.bind(function(memo, result) {
                return memo.concat(_.filter(result, _.bind(function(train) {
                    return train.stations(this.from, this.to) !== undefined;
                }, this)));
            }, this), []);

            var sortedTrains = _.sortBy(trains, _.bind(function(train) {
                return train.time(this.from)
            }, this));

            var uniqueTrains = _.uniq(sortedTrains, false, function(train) {
                return train.number();
            });

            return uniqueTrains;
        };

        this.findTrain = function(trains, unique) {
            return _.find(trains, function(train) {
                return (train.number() == unique.number());
            });
        };

        this.createDetails = function(station, key, verb, earlyIsBad) {
            var templ;
            var lateness = station[key];

            // up to and including three minutes late is fine
            if ((lateness <= 3 && lateness >= 0) || (lateness < 0 && !earlyIsBad)) {
                templ = templateDetailsOk;
            } else if (lateness < 0 && earlyIsBad) {
                templ = templateDetailsEarly;
                lateness = Math.abs(lateness);
            } else {
                templ = templateDetailsLate;
            }

            return templ({
                stationName: station.stazione,
                verb: verb,
                minsLate: lateness
            });
        };

        this.gotTrainData = function(results) {
            this.setLoadingText("Processing train data...");

            // get unique list of train numbers from all days
            var uniques = this.getUniqueTrains(results);

            this.setLoadingText("Updating table headings...");

            function pad(n) {
                return (n < 10) ? ("0" + n) : n;
            }

            _.each(uniques, _.bind(function(t) {
                var s = t.time(this.from)
                    .format("HH:mm");

                $("#header-times")
                    .append($("<th>")
                            .text(s));
            }, this));

            this.setLoadingText("Filling table...");

            // start filling in the real data
            var keys = _.keys(results);
            _.each(keys.sort(), _.bind(function(date) {
                var d = moment(date);
                var row = $("<tr>");
                $("<td>")
                    .text(d.format("ddd Do MMMM YYYY"))
                    .addClass("nowrap")
                    .appendTo(row);

                _.each(uniques, _.bind(function(unique) {
                    var train = this.findTrain(results[date], unique);

                    var cell = $("<td>").appendTo(row);

                    var stations = train ?
                        train.stations(this.from, this.to) :
                        undefined;

                    // when there is no information about the train
                    if (!train || !stations) {
                        cell.append(templateDetailsNoData);
                        cell.append(templateDetailsNoData);
                        return; // continue
                    }

                    var details = this.createDetails(stations[0],
                                                 "ritardoPartenza",
                                                 "leaving", true);
                    cell.append(details);
                    details = this.createDetails(stations[1],
                                                 "ritardoArrivo",
                                                 "arriving into", false);
                    cell.append(details);
                }, this));

                $("#data").append(row);
            }, this));

            $("#loading").remove();
            $("#trains").show(100);
        };
    };

    return Ritardo;
});
