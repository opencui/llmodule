

{{schema.name}} = dspy.{{strategy}}()
{{schema.name}}.load_state({{implementation}})

@app.post("/{{schema.name}}/")
async def process(item: {{schema.name}}Request):
    return {{schema.name}}(**item)

