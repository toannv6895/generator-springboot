package <%= packageName %>.model.response;

public record <%= entityName %>Response(
<% columns.forEach((column, index) => { %>
    <%= column.javaType %> <%= column.fieldName %><% if (index < columns.length - 1) { %>, <% } %>
<% }); %>) {}