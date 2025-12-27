import inspect
from xai_sdk import AsyncClient

print(inspect.signature(AsyncClient.__init__))
