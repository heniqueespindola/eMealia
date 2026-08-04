// Conteúdo dos Termos de Serviço e Política de Privacidade.
//
// NOTA IMPORTANTE: este é um texto de exemplo/placeholder, escrito para dar
// à app uma base coerente com o que ela realmente faz (Supabase na UE,
// RevenueCat, sincronização opcional com Apple Health / Health Connect,
// conteúdo de receitas de terceiros). NÃO é aconselhamento jurídico. Antes
// de lançares a app publicamente — especialmente por lidares com dados de
// saúde e estares sujeito ao RGPD — faz rever este texto por um advogado.
//
// Fica à parte das traduções normais (src/i18n/translations) porque é
// conteúdo extenso e não precisa da interpolação %{...} usada nas
// strings de interface.

interface DocumentoLegal {
  titulo: string;
  atualizado: string;
  corpo: string;
}

interface ConteudoLegal {
  termos: DocumentoLegal;
  privacidade: DocumentoLegal;
}

export const LEGAL_CONTENT: Record<'pt' | 'en' | 'es', ConteudoLegal> = {
  pt: {
    termos: {
      titulo: 'Termos de Serviço',
      atualizado: 'Última atualização: 4 de agosto de 2026',
      corpo: `1. Aceitação dos termos
Ao criar uma conta ou utilizar a eMealia ("a aplicação", "o serviço"), aceitas estes Termos de Serviço na íntegra. Se não concordares com algum destes termos, não deves utilizar a aplicação.

2. O que é a eMealia
A eMealia é uma aplicação de descoberta de receitas e planeamento de refeições, que te ajuda a cozinhar com o que já tens em casa, a organizar a tua despensa, planear a semana e acompanhar macronutrientes. Parte do conteúdo de receitas (vídeos, imagens, ligações) provém de plataformas de terceiros como YouTube, TikTok, Instagram e Spoonacular, e é apresentado a título meramente informativo.

3. A tua conta
Precisas de criar uma conta com um email válido para usar a maior parte das funcionalidades. És responsável por manter a confidencialidade da tua password e por toda a atividade realizada através da tua conta. Deves ter pelo menos 16 anos para criar uma conta; a eMealia não é dirigida a crianças.

4. Planos Grátis e Premium
Oferecemos um plano Grátis com funcionalidades limitadas e um plano Premium, pago através de subscrição mensal ou anual, gerido pela loja de aplicações (App Store / Google Play) e processado através do RevenueCat. As subscrições renovam-se automaticamente, salvo cancelamento feito nas definições da tua conta na loja de aplicações, com pelo menos 24 horas de antecedência em relação ao fim do período em curso. Os preços podem ser alterados mediante aviso prévio.

5. Conteúdo de terceiros
Não somos donos nem controlamos o conteúdo de receitas que aparece no feed, proveniente de criadores e plataformas externas. Não garantimos a exatidão nutricional, de alergénios ou de instruções de confeção desse conteúdo — usa o teu próprio critério, especialmente em caso de alergias ou restrições alimentares.

6. Utilização aceitável
Compromete-te a não: (a) usar a aplicação para fins ilegais; (b) tentar aceder a contas de outros utilizadores; (c) fazer engenharia reversa, copiar ou distribuir a aplicação sem autorização; (d) sobrecarregar ou interferir com os nossos sistemas.

7. Propriedade intelectual
A marca eMealia, o design, os textos originais e o código da aplicação são propriedade da eMealia ou dos seus licenciadores. O conteúdo de receitas de terceiros permanece propriedade dos respetivos criadores.

8. Isenção de responsabilidade
A eMealia não substitui aconselhamento médico, nutricional ou de saúde profissional. Os valores de macronutrientes e sugestões de refeições são estimativas e não devem ser a única base para decisões de saúde. Consulta um profissional de saúde antes de alterares significativamente a tua dieta, especialmente se tiveres condições médicas.

9. Limitação de responsabilidade
Na máxima medida permitida por lei, a eMealia não se responsabiliza por danos indiretos, incidentais ou consequenciais resultantes do uso da aplicação, incluindo reações alérgicas, decisões de saúde ou perdas de dados.

10. Alterações aos termos
Podemos atualizar estes termos periodicamente. Notificar-te-emos de alterações significativas através da aplicação ou por email. A utilização continuada após a alteração implica aceitação dos novos termos.

11. Lei aplicável
Estes termos regem-se pela lei portuguesa, sem prejuízo dos direitos que te assistem como consumidor residente na União Europeia.

12. Contacto
Para questões sobre estes termos, contacta-nos em suporte@emealia.app.`,
    },
    privacidade: {
      titulo: 'Política de Privacidade',
      atualizado: 'Última atualização: 4 de agosto de 2026',
      corpo: `1. Responsável pelo tratamento
A eMealia é responsável pelo tratamento dos teus dados pessoais nos termos do Regulamento Geral sobre a Proteção de Dados (RGPD). Para qualquer questão sobre privacidade, contacta-nos em privacidade@emealia.app.

2. Dados que recolhemos
Recolhemos: (a) dados de conta — email e password (encriptada); (b) dados de perfil — nome, foto, preferências e filtros dietéticos, frequência de cozinha; (c) dados de utilização — despensa, receitas favoritas, planeamento semanal, objetivos e histórico de macronutrientes; (d) dados de saúde — apenas se ativares voluntariamente a sincronização com a Apple Health ou o Health Connect, para exportar totais de calorias e macros; (e) dados técnicos — idioma, plataforma do dispositivo, registos de erro.

3. Como usamos os teus dados
Usamos os teus dados para: fornecer e personalizar o serviço (recomendações, listas de compras, plano semanal); gerir a tua subscrição; melhorar a aplicação; e comunicar contigo sobre a tua conta. Não vendemos os teus dados pessoais.

4. Onde os teus dados são armazenados
Os teus dados são armazenados na infraestrutura da Supabase, alojada na União Europeia (Frankfurt, Alemanha), com medidas técnicas de segurança como encriptação em trânsito e em repouso.

5. Partilha com terceiros
Partilhamos dados limitados com prestadores de serviço estritamente necessários ao funcionamento da aplicação: o RevenueCat, para gerir subscrições; a Apple ou a Google, quando ativas a sincronização de saúde ou usas o login com essas contas; e serviços de infraestrutura como o Supabase. Estes prestadores estão contratualmente obrigados a proteger os teus dados e só os podem usar para nos prestar o serviço.

6. Base legal (RGPD)
Tratamos os teus dados com base: na execução do contrato de utilização do serviço; no teu consentimento explícito, para dados de saúde e comunicações opcionais; e no nosso interesse legítimo em melhorar e proteger a aplicação.

7. Quanto tempo guardamos os teus dados
Guardamos os teus dados enquanto a tua conta estiver ativa. Se eliminares a conta, os teus dados pessoais são apagados, salvo obrigação legal de retenção mais longa.

8. Os teus direitos
Nos termos do RGPD, tens direito a: aceder aos teus dados, corrigi-los, apagá-los, exportá-los (portabilidade) e opor-te a determinados tratamentos. Podes exportar os teus dados e eliminar a tua conta diretamente no ecrã de Perfil > Privacidade, ou contactando-nos em privacidade@emealia.app. Tens também o direito de apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD).

9. Menores
A eMealia não se destina a menores de 16 anos e não recolhemos intencionalmente dados de crianças.

10. Alterações a esta política
Podemos atualizar esta política periodicamente. Notificar-te-emos de alterações significativas através da aplicação.`,
    },
  },
  en: {
    termos: {
      titulo: 'Terms of Service',
      atualizado: 'Last updated: August 4, 2026',
      corpo: `1. Acceptance of terms
By creating an account or using eMealia ("the app", "the service"), you accept these Terms of Service in full. If you do not agree with any of these terms, you must not use the app.

2. What eMealia is
eMealia is a recipe discovery and meal planning app that helps you cook with what you already have at home, organize your pantry, plan your week, and track macronutrients. Some recipe content (videos, images, links) comes from third-party platforms such as YouTube, TikTok, Instagram, and Spoonacular, and is provided for informational purposes only.

3. Your account
You need to create an account with a valid email to use most features. You are responsible for keeping your password confidential and for all activity carried out through your account. You must be at least 16 years old to create an account; eMealia is not directed at children.

4. Free and Premium plans
We offer a Free plan with limited features and a Premium plan, paid via monthly or annual subscription, managed through the app store (App Store / Google Play) and processed via RevenueCat. Subscriptions renew automatically unless cancelled in your app store account settings at least 24 hours before the end of the current period. Prices may change with prior notice.

5. Third-party content
We do not own or control the recipe content shown in the feed, which comes from creators and external platforms. We do not guarantee the nutritional accuracy, allergen information, or cooking instructions of that content — use your own judgment, especially in case of allergies or dietary restrictions.

6. Acceptable use
You agree not to: (a) use the app for unlawful purposes; (b) attempt to access other users' accounts; (c) reverse-engineer, copy, or distribute the app without authorization; (d) overload or interfere with our systems.

7. Intellectual property
The eMealia brand, design, original text, and app code are the property of eMealia or its licensors. Third-party recipe content remains the property of its respective creators.

8. Disclaimer
eMealia does not replace professional medical, nutritional, or health advice. Macronutrient values and meal suggestions are estimates and should not be the sole basis for health decisions. Consult a healthcare professional before significantly changing your diet, especially if you have medical conditions.

9. Limitation of liability
To the fullest extent permitted by law, eMealia is not liable for indirect, incidental, or consequential damages arising from use of the app, including allergic reactions, health decisions, or data loss.

10. Changes to these terms
We may update these terms periodically. We will notify you of significant changes through the app or by email. Continued use after a change constitutes acceptance of the new terms.

11. Governing law
These terms are governed by Portuguese law, without prejudice to the rights available to you as a consumer resident in the European Union.

12. Contact
For questions about these terms, contact us at suporte@emealia.app.`,
    },
    privacidade: {
      titulo: 'Privacy Policy',
      atualizado: 'Last updated: August 4, 2026',
      corpo: `1. Data controller
eMealia is the controller of your personal data under the General Data Protection Regulation (GDPR). For any privacy questions, contact us at privacidade@emealia.app.

2. Data we collect
We collect: (a) account data — email and (encrypted) password; (b) profile data — name, photo, dietary preferences and filters, cooking frequency; (c) usage data — pantry, favorite recipes, weekly plan, macro goals and history; (d) health data — only if you voluntarily enable syncing with Apple Health or Health Connect, to export calorie and macro totals; (e) technical data — language, device platform, error logs.

3. How we use your data
We use your data to: provide and personalize the service (recommendations, shopping lists, weekly plan); manage your subscription; improve the app; and communicate with you about your account. We do not sell your personal data.

4. Where your data is stored
Your data is stored on Supabase's infrastructure, hosted in the European Union (Frankfurt, Germany), with technical safeguards such as encryption in transit and at rest.

5. Sharing with third parties
We share limited data with service providers strictly necessary to run the app: RevenueCat, to manage subscriptions; Apple or Google, when you enable health syncing or sign in with those accounts; and infrastructure services such as Supabase. These providers are contractually required to protect your data and may only use it to provide services to us.

6. Legal basis (GDPR)
We process your data based on: performance of the contract to use the service; your explicit consent, for health data and optional communications; and our legitimate interest in improving and securing the app.

7. How long we keep your data
We keep your data for as long as your account is active. If you delete your account, your personal data is erased, unless a longer retention period is legally required.

8. Your rights
Under GDPR, you have the right to: access your data, correct it, delete it, export it (portability), and object to certain processing. You can export your data and delete your account directly from Profile > Privacy, or by contacting us at privacidade@emealia.app. You also have the right to lodge a complaint with your national data protection authority.

9. Children
eMealia is not intended for children under 16, and we do not knowingly collect data from children.

10. Changes to this policy
We may update this policy periodically. We will notify you of significant changes through the app.`,
    },
  },
  es: {
    termos: {
      titulo: 'Términos de Servicio',
      atualizado: 'Última actualización: 4 de agosto de 2026',
      corpo: `1. Aceptación de los términos
Al crear una cuenta o utilizar eMealia ("la aplicación", "el servicio"), aceptas estos Términos de Servicio en su totalidad. Si no estás de acuerdo con alguno de estos términos, no debes utilizar la aplicación.

2. Qué es eMealia
eMealia es una aplicación de descubrimiento de recetas y planificación de comidas que te ayuda a cocinar con lo que ya tienes en casa, organizar tu despensa, planificar la semana y hacer seguimiento de macronutrientes. Parte del contenido de recetas (vídeos, imágenes, enlaces) proviene de plataformas de terceros como YouTube, TikTok, Instagram y Spoonacular, y se presenta únicamente con fines informativos.

3. Tu cuenta
Necesitas crear una cuenta con un email válido para usar la mayoría de las funciones. Eres responsable de mantener la confidencialidad de tu contraseña y de toda la actividad realizada a través de tu cuenta. Debes tener al menos 16 años para crear una cuenta; eMealia no está dirigida a menores.

4. Planes Gratis y Premium
Ofrecemos un plan Gratis con funciones limitadas y un plan Premium, de pago mediante suscripción mensual o anual, gestionado a través de la tienda de aplicaciones (App Store / Google Play) y procesado mediante RevenueCat. Las suscripciones se renuevan automáticamente salvo cancelación en la configuración de tu cuenta de la tienda de aplicaciones, con al menos 24 horas de antelación al final del período en curso. Los precios pueden cambiar con aviso previo.

5. Contenido de terceros
No somos propietarios ni controlamos el contenido de recetas que aparece en el feed, procedente de creadores y plataformas externas. No garantizamos la exactitud nutricional, de alérgenos ni de las instrucciones de cocción de ese contenido — usa tu propio criterio, especialmente en caso de alergias o restricciones alimentarias.

6. Uso aceptable
Te comprometes a no: (a) usar la aplicación con fines ilegales; (b) intentar acceder a cuentas de otros usuarios; (c) realizar ingeniería inversa, copiar o distribuir la aplicación sin autorización; (d) sobrecargar o interferir con nuestros sistemas.

7. Propiedad intelectual
La marca eMealia, el diseño, los textos originales y el código de la aplicación son propiedad de eMealia o de sus licenciantes. El contenido de recetas de terceros sigue siendo propiedad de sus respectivos creadores.

8. Exención de responsabilidad
eMealia no sustituye el asesoramiento médico, nutricional o de salud profesional. Los valores de macronutrientes y las sugerencias de comidas son estimaciones y no deben ser la única base para decisiones de salud. Consulta a un profesional de la salud antes de cambiar significativamente tu dieta, especialmente si tienes condiciones médicas.

9. Limitación de responsabilidad
En la máxima medida permitida por la ley, eMealia no se hace responsable de daños indirectos, incidentales o consecuentes derivados del uso de la aplicación, incluidas reacciones alérgicas, decisiones de salud o pérdidas de datos.

10. Cambios en estos términos
Podemos actualizar estos términos periódicamente. Te notificaremos los cambios significativos a través de la aplicación o por email. El uso continuado tras el cambio implica la aceptación de los nuevos términos.

11. Ley aplicable
Estos términos se rigen por la ley portuguesa, sin perjuicio de los derechos que te asisten como consumidor residente en la Unión Europea.

12. Contacto
Para preguntas sobre estos términos, contáctanos en suporte@emealia.app.`,
    },
    privacidade: {
      titulo: 'Política de Privacidad',
      atualizado: 'Última actualización: 4 de agosto de 2026',
      corpo: `1. Responsable del tratamiento
eMealia es responsable del tratamiento de tus datos personales conforme al Reglamento General de Protección de Datos (RGPD). Para cualquier consulta sobre privacidad, contáctanos en privacidade@emealia.app.

2. Datos que recopilamos
Recopilamos: (a) datos de cuenta — email y contraseña (cifrada); (b) datos de perfil — nombre, foto, preferencias y filtros dietéticos, frecuencia de cocina; (c) datos de uso — despensa, recetas favoritas, planificación semanal, objetivos e historial de macronutrientes; (d) datos de salud — solo si activas voluntariamente la sincronización con Apple Health o Health Connect, para exportar totales de calorías y macros; (e) datos técnicos — idioma, plataforma del dispositivo, registros de errores.

3. Cómo usamos tus datos
Usamos tus datos para: proporcionar y personalizar el servicio (recomendaciones, listas de la compra, plan semanal); gestionar tu suscripción; mejorar la aplicación; y comunicarnos contigo sobre tu cuenta. No vendemos tus datos personales.

4. Dónde se almacenan tus datos
Tus datos se almacenan en la infraestructura de Supabase, alojada en la Unión Europea (Fráncfort, Alemania), con medidas técnicas de seguridad como el cifrado en tránsito y en reposo.

5. Compartición con terceros
Compartimos datos limitados con proveedores de servicios estrictamente necesarios para el funcionamiento de la aplicación: RevenueCat, para gestionar suscripciones; Apple o Google, cuando activas la sincronización de salud o inicias sesión con esas cuentas; y servicios de infraestructura como Supabase. Estos proveedores están obligados contractualmente a proteger tus datos y solo pueden usarlos para prestarnos el servicio.

6. Base legal (RGPD)
Tratamos tus datos con base en: la ejecución del contrato de uso del servicio; tu consentimiento explícito, para datos de salud y comunicaciones opcionales; y nuestro interés legítimo en mejorar y proteger la aplicación.

7. Cuánto tiempo conservamos tus datos
Conservamos tus datos mientras tu cuenta esté activa. Si eliminas la cuenta, tus datos personales se borran, salvo obligación legal de conservación más larga.

8. Tus derechos
Conforme al RGPD, tienes derecho a: acceder a tus datos, rectificarlos, eliminarlos, exportarlos (portabilidad) y oponerte a ciertos tratamientos. Puedes exportar tus datos y eliminar tu cuenta directamente en Perfil > Privacidad, o contactándonos en privacidade@emealia.app. También tienes derecho a presentar una reclamación ante tu autoridad nacional de protección de datos.

9. Menores
eMealia no está destinada a menores de 16 años y no recopilamos intencionadamente datos de menores.

10. Cambios en esta política
Podemos actualizar esta política periódicamente. Te notificaremos los cambios significativos a través de la aplicación.`,
    },
  },
};
