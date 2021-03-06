var assert = require("assert");
var path = require("path");
var _ = require("underscore");


module.exports = function (opcua) {


    function _equipment_madeUpOfEquipments() {
        var node = this;
        var addressSpace = node.addressSpace;
        var madeUpOfEquipment = addressSpace.findISA95ReferenceType("MadeUpOfEquipment");
        return node.findReferencesExAsObject(madeUpOfEquipment);
    }

    // function _addDefinedByEquipmentClassReference(instance,type) {
    //     _addDefinedByFooClassReference(instance,"DefinedByEquipmentClass","EquipmentClassType",type);
    // }


    function _addContainedByEquipmentReference(node,equipment) {
        opcua.ISA95.utils._addContainedByFooReference(node,equipment,"EquipmentType","MadeUpOfEquipment");
    }

    /**
     * @param options
     * @param options.browseName {String/QualifiedName} : the new EquipmentClassType name
     * @param [options.equipmentLevel {EquipmentLevel}] : the EquipmentLevel
     * @param options.containedByEquipment
     */
    opcua.AddressSpace.prototype.addEquipmentClassType = function(options) {

        assert(options.browseName);
        var addressSpace  = this;

        var equipmentClassType = addressSpace.findISA95ObjectType("EquipmentClassType");

        var newEquipmentClassType = addressSpace.addObjectType({
            browseName: options.browseName,
            subtypeOf: equipmentClassType
        });

        function addEquipmentLevelAttribute(node,equipmentLevel) {
            // add a equipmentLevel property
            // HasA95Attribute Variable EquipmentLevel ISA95Equipment
            addressSpace.addISA95Attribute({
                ISA95AttributeOf: node,
                browseName: "EquipmentLevel",
                dataType: "ISA95EquipmentElementLevelEnum",
                value: { dataType: opcua.DataType.Int32 , value: equipmentLevel.value},
                modellingRule: "Mandatory"
            });
        }
        // add optional property Equipment Level
        if (options.equipmentLevel) {
            addEquipmentLevelAttribute(newEquipmentClassType, options.equipmentLevel);
        }

        // create equipmentLevel
        if (options.equipmentLevel) {
            function installEquipmentLevelOnInstance(instance,type) {
                addEquipmentLevelAttribute(instance, options.equipmentLevel);
            }
            // make sure optional property equipmentLevel gets duplicated during Type instantiation
            newEquipmentClassType.installPostInstallFunc(installEquipmentLevelOnInstance);
        }

        //xx newEquipmentClassType.installPostInstallFunc(_addDefinedByEquipmentClassReference);

        //xx function addContainedByEquipmentRefPostFunc(instance,type,options) {
        //xx     if (options.containedByEquipment) {
        //xx         _addContainedByEquipmentReference(instance,options.containedByEquipment);
        //xx     }
        //xx }
        //xx newEquipmentClassType.installPostInstallFunc(addContainedByEquipmentRefPostFunc);

        //xx newEquipmentType.addISA95ClassProperty = addISA95ClassProperty;
        return newEquipmentClassType;
    };



    /**
     * @param options
     * @param options.browseName {String/QualifiedName} : the new EquipmentClassType name
     * @param [options.equipmentLevel {EquipmentLevel}] : the EquipmentLevel
     * @param options.definedByEquipmentClass = [] : a array of EquipmentClassType that defines this equipment Type
     */
    opcua.AddressSpace.prototype.addEquipmentType = function(options) {

        assert(options.browseName);
        var addressSpace  = this;

        var ns = addressSpace.getISA95Namespace();
        var equipmentType = addressSpace.findObjectType("EquipmentType",ns);

        options.subtypeOf = options.subtypeOf || equipmentType;
        assert(equipmentType.isSupertypeOf(options.subtypeOf),"#addEquipmentType options.subtypeOf must be a subtype of EquipmentType");

        var newEquipmentType = addressSpace.addObjectType({
            browseName: options.browseName,
            subtypeOf: options.subtypeOf
        });

        // add the DefinedByEquipmentClass reference
        opcua.ISA95.utils.addDefinedByFooClass(newEquipmentType,"DefinedByEquipmentClass","EquipmentPropertyType",options);

        return newEquipmentType;

    };

    /**
     * @method addEquipment
     * @param options
     * @param options.browseName {String|QualifiedName}
     * @param [options.typeDefinition {String|UAObjectType} = "EquipmentType"]
     *         the ISA95  Type of the equipment to instantiate. if not specified, EquipmentType will be used
     *         the provided typeDefinition must be a sub type of "EquipmentType".
     * @param options.definedByEquipmentClass {UAObjectType}
     *         Must be a subtype of "EquipmentClassType"
     * @param options.containedByEquipment {UAObject}.
     * @param [options.organizedBy]
     * @param [options.nodeId] {NodeId|String}
     *
     * Attribute Value
     * BrowseName EquipmentType
     * IsAbstract False
     * Subtype of the ISA95ObjectType defined in 7.6.3.
     * References               NodeClass BrowseName            DataType       TypeDefinition        ModellingRule
     * HasISA95Property         Variable  <PropertyName>        BaseDataType   EquipmentPropertyType OptionalPlaceholder
     * DefinedByEquipmentClass  Object    <EquipmentClass>                     EquipmentClassType    OptionalPlaceholder
     * TestedByEquipmentTest    Object    <TestSpecification>                  EquipmentCapabilityTestSpecificationType OptionalPlaceholder
     * MadeUpOfEquipment        Object    <Equipment>                          EquipmentType         OptionalPlaceholder
     * HasISA95Attribute        Variable  EquipmentLevel        ISA95Equipment ElementLevelEnum PropertyType Optional
     * ImplementedBy            Object    PhysicalAsset                        PhysicalAssetType      Optional
     * HasComponent             Variable  AssetAssignment       structure      ISA95AssetAssignmentType Optional
     */
    opcua.AddressSpace.prototype.addEquipment = function(options) {

        var addressSpace  = this;

        // The TargetNode of this ReferenceType shall be an Object of EquipmentClassType or its subtype.
        var definedByEquipmentClass = addressSpace.findISA95ReferenceType("DefinedByEquipmentClass");
        var equipmentClassType      = addressSpace.findISA95ObjectType("EquipmentClassType");
        var equipmentType           = addressSpace.findISA95ObjectType("EquipmentType");

        options.typeDefinition = options.typeDefinition || equipmentType;

        // The SourceNode of this ReferenceType shall be an Object of EquipmentType or its subtype.
        assert(options.typeDefinition.isSupertypeOf(equipmentType),"TypeDefinition of Equipment to create shall be of type EquipmentType");

        //
        if(options.containedByEquipment) {
            if (!options.containedByEquipment.typeDefinitionObj.isSupertypeOf(equipmentType)) {
                console.log("equipmentType = ",equipmentType.toString());
                console.log("equipmentType = ",options.containedByEquipment.toString());
                throw new Error("options.containedByEquipment must have a type definition which is a subtype of 'EquipmentType' ");
            }
            // add containedByEquipment
        }

        var equipment = addressSpace.addObject({
            typeDefinition: options.typeDefinition,
            browseName:    options.browseName,
            description:   options.description,
            nodeId:        options.nodeId,
            organizedBy: options.organizedBy,
        });

        if (options.typeDefinition) {
            //xx assert(_.isArray(options.typeDefinition.definedByEquipmentClass));
            var objs = options.typeDefinition.findReferencesExAsObject(definedByEquipmentClass);
            options.definedByEquipmentClass = options.definedByEquipmentClass ||[];
            options.definedByEquipmentClass = [].concat(options.definedByEquipmentClass,objs);
            //options.typeDefinition.definedByEquipmentClass);
            //xx console.log("options.definedByEquipmentClass",options.definedByEquipmentClass.forEach(f => f.toString()))
        }

        assert(options.definedByEquipmentClass," expecting a definedByEquipmentClass options");
        opcua.ISA95.utils.installDefinedByFooClassReferences({
            node: equipment,
            definedByFooClass :options.definedByEquipmentClass,
            fooClassType:      equipmentClassType,
            definedByFooClassRef: "DefinedByEquipmentClass",
            fooType:           equipmentType,
        });

        options.definedByEquipmentClass.forEach(function(equipmentClass){
            opcua.ISA95.utils._transferISA95Attributes(equipment,equipmentClass);
        });

        if (options.containedByEquipment) {
            _addContainedByEquipmentReference(equipment,options.containedByEquipment);
        }

        equipment.madeUpOfEquipments = _equipment_madeUpOfEquipments;

        return equipment;

    };

};
