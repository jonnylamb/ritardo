from datetime import datetime
import json
import requests
import os


TO = [
    # tuscolana to quattro venti
    # 07:15
    7404,
    # 07:45
    7406,
    # 08:14
    21926,
    # 08:59
    7410,
    # 09:29
    7412,
    # 10:29
    7416,
    # 11:29
    7420,
    # 11:59
    7422,
]

FROM = [
    # quattro venti to tuscolana
    # 15:00
    7431,
    # 15:30
    7433,
    # 17:00
    7439,
    # 17:30
    7441,
    # 19:30
    7449,
    # 19:48
    7451,
    # 20:00
    7453,
]

# requests.Response.json change from a dict to an instance method at
# some point
def get_json(r):
    if isinstance(r.json, dict):
        return r.json
    else:
        return r.json()

def partenza(number):
    url  = 'http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/cercaNumeroTreno/' + str(number)
    r = requests.get(url)
    j = get_json(r)

    return j['codLocOrig']

def andamento(number):
    station = partenza(number)

    url = 'http://www.viaggiatreno.it/viaggiatrenonew/resteasy/viaggiatreno/andamentoTreno/%s/%s' % (station, number)
    r = requests.get(url)
    return get_json(r)

def dirname():
    now = datetime.now()
    d = now.strftime('%Y-%m-%d')

    if not os.path.exists(d):
        os.mkdir(d)

    return d

def train(number, geton, getoff):
    path = os.path.join(dirname(), '%s.json' % number)

    if not os.path.exists(path):
        try:
            j = andamento(number)
        except:
            print 'train number %s failed; skipping.' % number
            return

        with open(path, 'w') as f:
            print '%s -> %s' % (j['origine'], j['destinazione'])
            t = json.dumps(j, indent=2)
            f.write(t)

def main():
    for number in TO:
        train(number, '', '')

    for number in FROM:
        train(number, '', '')

if __name__ == '__main__':
    main()
