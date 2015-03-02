import os
import json

def main():
    results = {}

    for f in [x for x in os.listdir('.') if os.path.isdir(x) and len(x.split('-')) == 3]:
        results[f] = []
        for t in [x for x in os.listdir(f) if x.endswith('.json')]:
            results[f].append(t)

    print json.dumps(results)

if __name__ == '__main__':
    main()
