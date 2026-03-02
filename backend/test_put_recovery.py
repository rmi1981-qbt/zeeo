import urllib.request
import json

req = urllib.request.Request(
    'http://localhost:8000/deliveries/fb56f85f-190c-4f67-aa26-3a4bcdfa259c/status',
    data=b'{"status": "at_gate", "request_channels": ["recovered"]}',
    headers={'Content-Type': 'application/json'},
    method='PUT'
)
try:
    with urllib.request.urlopen(req) as response:
        print('SUCCESS', response.read().decode())
except urllib.error.HTTPError as e:
    err_body = e.read().decode()
    try:
        err_json = json.loads(err_body)
        if 'detail' in err_json:
            print("ERROR", err_json['detail'])
        else:
            print("ERROR", err_json)
    except:
        print("ERROR", err_body)

