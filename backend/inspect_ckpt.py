import os
import torch
from huggingface_hub import hf_hub_download
MODEL_REPO = os.getenv('HF_MODEL_REPO', 'akshithawork1422/neurospace')
MODEL_FILE = os.getenv('HF_MODEL_FILE', 'best_cmu_93.2pct.pt')
path = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILE)
print('checkpoint', path)
ckpt = None
try:
    ckpt = torch.load(path, map_location='cpu', weights_only=False)
except TypeError:
    ckpt = torch.load(path, map_location='cpu')
print('type', type(ckpt))
if isinstance(ckpt, dict):
    print('keys', list(ckpt.keys()))
    model = ckpt['model'] if 'model' in ckpt else ckpt
    print('model type', type(model))
    for k in list(model.keys())[:20]:
        v = model[k]
        print(k, getattr(v, 'shape', type(v)))
    for key in ['phones', 'vocab', 'phonemes', 'token_to_id', 'config']:
        if key in ckpt:
            print(key, ckpt[key])
    for k in model:
        if 'projection.3.weight' in k or 'projection.3.bias' in k:
            print('match', k, model[k].shape)
else:
    print('checkpoint payload is not a dict')
