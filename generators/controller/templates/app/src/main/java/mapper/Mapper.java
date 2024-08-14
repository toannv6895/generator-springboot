package <%= packageName %>.mapper;

import <%= packageName %>.entities.<%= entityName %>;
import <%= packageName %>.model.request.<%= entityName %>Request;
import <%= packageName %>.model.response.<%= entityName %>Response;
import java.util.List;
import org.mapstruct.*;

@Mapper(unmappedTargetPolicy = ReportingPolicy.IGNORE, componentModel = MappingConstants.ComponentModel.SPRING)
public interface <%= entityName %>Mapper {
    <%= entityName %> toEntity(<%= entityName %>Request <%= entityVarName %>Request);
    <%= entityName %>Response toDto(<%= entityName %> <%= entityVarName %>);
    List<<%= entityName %>Response> toDto(List<<%= entityName %>> <%= entityVarName %>List);
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    <%= entityName %> partialUpdate(<%= entityName %>Request <%= entityVarName %>Request, @MappingTarget <%= entityName %> <%= entityVarName %>);
}
