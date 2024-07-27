

class {{ schema.name }}Request(BaseModel):
    """ {{ schema.description }} """
    {% for field in schema.fields %}
    {% if field.mode == "input" %}
    {{field.name}} : {{field.true_type}}
    {% endif %}
    {% endfor %}



class {{schema.name}}Response(BaseModel):
    """ {{ schema.description }} """
    {% for field in schema.fields %}
    {% if field.mode == "output" %}
    {{field.name}} : {{field.true_type}}
    {% endif %}
    {% endfor %}




