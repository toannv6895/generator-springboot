package <%= packageName %>.entities;

import java.util.Objects;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.Hibernate;

@Entity
@Table(name = "<%= tableName %>")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class <%= entityName %> {

<% columns.forEach(function(column) { %>
    <% if (column.fieldName === "id") { %>
        @Id
        <% if (!doesNotSupportDatabaseSequences) { %>
            @GeneratedValue(strategy = GenerationType.SEQUENCE)
        <% } else { %>
            @GeneratedValue(strategy = GenerationType.IDENTITY)
        <% } %>
        private Long id;
    <% } else { %>
        @Column(name = "<%= column.name %>")
        private <%= column.javaType %> <%= column.fieldName %>;
    <% } %>
<% }); %>

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        <%= entityName %> <%= entityVarName %> = (<%= entityName %>) o;
        return id != null && Objects.equals(id, <%= entityVarName %>.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
