## Creating component
Follow this steps when creating component:
1. Analyse requirements, compare them with common instructions and with similar components
2. Prepare implementation plan
3. Implement component by using best coding practices
4. Review implemented component. Spot issues. Improve code.
5. Implement tests
6. Implement story

Use existing components, especially LayoutBuilder for compositions. Prepare custom components only if existing components are not covering some use cases.
- NEVER modify the HTMLElement returned by build() — all configuration must happen via builder methods BEFORE build()