---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: home
---

<!DOCTYPE html>
<html>
<head>
    <title>Welcome to My Website</title>
</head>
<body>

<h1>Welcome to My Website</h1>

{% for post in site.posts %}
    <h2>{{ post.title }}</h2>
    <p>{{ post.excerpt }}</p>
    <ul>
        {% for category in post.categories %}
            <li><a href="/{{ category }}/">{{ category }}</a></li>
        {% endfor %}
    </ul>
{% endfor %}

</body>
</html>
