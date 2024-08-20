package <%= packageName %>.model.request;

import jakarta.validation.constraints.NotEmpty;

public record <%= entityName %>Request(
<% columns.forEach((column, index) => { %>
    <% if (!column.nullable && column.fieldName !== 'id') { %>
        @NotEmpty(message = "<%= column.fieldName %> cannot be empty")
    <% } %>
    <%= column.javaType %> <%= column.fieldName %><% if (index < columns.length - 1) { %>, <% } %>
<% }); %>) {}