This set of scripts automate downloading Italian train lateness
information and then summarize the data in HTML. The first parts are
in Python and do very simple things because that's what I wanted to
run in a cron job. After having written these I changed my mind and
decided that instead of making a Python script to generate static HTML
I wanted to generate the table on the fly in a browser, hence the next
part is in JavaScript.

* `get.py` gets the status of all the trains defined in that file. It
  should be run at the end of the day when all the trains have
  run. This generates a folder named the current day (for example
  `2015-02-27`) in which JSON files for each train are saved.
* `filelist.py` outputs a list of train JSON files. This should be
  saved to `filelist.json`.
* `index.html` is the static starting point for the browser and also
  contains the stations the user is interested in at the bottom.
* `ritardo.js` contains the JavaScript functions which download the
  previously saved JSON files and generates a table showing the
  lateness of the trains.

Generating the table in the browser and downloading every single JSON
file is a really bad idea in practice; I just fancied doing it as an
exercise.

Example
-------

At the time of writing: https://jonnylamb.com/ritardo/

The rationale behind all this is that I wanted to see how bad a
certain line was before committing to do a commute on the line every
day. I didn't want to actually do the journey as I wanted to check
multiple train times (not to mention I had other things to do), and I
wanted to automate the whole thing and make a pretty table.

Usage
-----

More for my reference because you really don't want to use this:

1. modify `get.py` to download all the trains you want to look at
   using their train number
2. run `get.py` and download some JSON files
3. generate `filelist.json` by `python filelist.py > filelist.json`
4. edit `index.html` at the end and replace `ROMA TUSCOLANA` and
   `QUATTRO VENTI` with the stations you're interested in.
5. put the generated files, `index.html`, and `ritardo.js` on a
   webserver and load the page in your browser.

Todo
----

* fix broken header times like 14:60
* cache templates
* show "levels of lateness" better (1 min late is fine. 10 is not)
* graphs!
